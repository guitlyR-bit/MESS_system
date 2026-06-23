/**
 * Správce klubu — přehled rezervací, správa kurtů, nastavení
 *
 * Tab PŘEHLED  — časová osa všech kurtů; přetažením slot přesunete rezervaci
 * Tab KURTY    — editace detailů kurtů (povrch, hala/venku, cena, …)
 * Tab NASTAVENÍ — editační zámek, provozní doba
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  PanResponder, Modal, TextInput, Switch, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';
import { useClubBookings } from '@/hooks/useClubBookings';
import {
  ALL_SLOTS, slotToTime, slotEndTime, getNext14Days, fmtDay,
  SPORT_LABELS, SURFACE_LABELS, SLOT_COUNT,
} from '@/lib/mockData';
import type { ClubBooking, CourtWithClub, CourtSurface, SportType } from '@/types/database';

// ─── Konstanty časové osy ─────────────────────────────────────────────────────

const SLOT_W   = 72;   // px / 30 min slot
const ROW_H    = 72;   // px / řada kurtu
const COL_W    = 92;   // px pro sloupec s názvem kurtu
const HEADER_H = 38;   // px výška řádku s časem

// ─── Barvy platebního stavu ───────────────────────────────────────────────────

const PAYMENT_BG: Record<string, string> = {
  paid:        '#16A34A',
  pay_on_site: '#D97706',
  pending:     '#94A3B8',
};
const PAYMENT_LABEL: Record<string, string> = {
  paid:        'Zaplaceno',
  pay_on_site: 'Platba na místě',
  pending:     'Nezaplaceno',
};

const W = colors.warm;
const SPORT_COLORS: Record<string, string> = {
  tennis: W.orange, badminton: W.rose, squash: W.red,
  padel: W.amber, volleyball: W.yellow,
};

// ─── Hlavní obrazovka ─────────────────────────────────────────────────────────

export default function ClubCourtsScreen() {
  const [tab, setTab] = useState<'timeline' | 'courts' | 'settings'>('timeline');
  const hook = useClubBookings();

  return (
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
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: PŘEHLED — časová osa s drag & drop
// ═══════════════════════════════════════════════════════════════════════════════

function TimelineTab({ hook }: { hook: ReturnType<typeof useClubBookings> }) {
  const { courts, getBookingsForDate, moveBooking, updateBooking, settings } = hook;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<ClubBooking | null>(null);

  const days      = getNext14Days();
  const dateKey   = selectedDate.toISOString().slice(0, 10);
  const dayBooks  = getBookingsForDate(dateKey);

  // Sloty viditelné podle provozní doby
  const visibleSlots = ALL_SLOTS.slice(settings.openingSlot, settings.closingSlot + 2);

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
    const cIdx = courts.findIndex(c => c.id === b.court_id);
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

  // Drag PanResponder — pohyb > 6px = drag (scroll jinak funguje), tap řeší TouchableOpacity
  const bookingIds = dayBooks.map(b => b.id).join(',');
  const panResponders = useMemo(() => {
    const map: Record<string, ReturnType<typeof PanResponder.create>> = {};

    dayBooks.forEach(booking => {
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
          const info = bookingInfoRef.current[booking.id];
          if (info) {
            const slotDelta   = Math.round(gs.dx / SLOT_W);
            const newStart    = Math.max(0, Math.min(SLOT_COUNT - info.slotCount, info.slotMin + slotDelta));
            const rowDelta    = Math.round(gs.dy / ROW_H);
            const newCourtIdx = Math.max(0, Math.min(courts.length - 1, info.courtIdx + rowDelta));
            const newCourtId  = courts[newCourtIdx]?.id ?? info.courtId;
            const newSlots    = Array.from({ length: info.slotCount }, (_, i) => newStart + i);
            // Použijeme ref pro čerstvá data — zamezí stale closure
            const others   = dayBooksRef.current.filter(b => b.id !== booking.id && b.court_id === newCourtId);
            const conflict = newSlots.some(s => others.some(ob => ob.slots.includes(s)));
            // Při konfliktu se neprovede žádná akce → rezervace se vrátí na původní místo
            if (!conflict) moveBookingRef.current(booking.id, newStart, newCourtId);
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
  }, [bookingIds, courts]);

  const timelineWidth = visibleSlots.length * SLOT_W;

  const timelineH = HEADER_H + courts.length * ROW_H;

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      {/* Výběr dne */}
      <View style={s.datePicker}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.datePickerContent}>
          {days.map((day, i) => {
            const fmt   = fmtDay(day);
            const isSel = day.toISOString().slice(0, 10) === dateKey;
            return (
              <TouchableOpacity key={i} onPress={() => setSelectedDate(day)}
                style={[s.dayChip, isSel && s.dayChipActive]}>
                <Text style={[s.dayChipWD, isSel && { color: '#fff' }]}>
                  {i === 0 ? 'DNES' : fmt.short}
                </Text>
                <Text style={[s.dayChipNum, isSel && { color: '#fff' }]}>{fmt.num}</Text>
                <Text style={[s.dayChipMonth, isSel && { color: 'rgba(255,255,255,0.7)' }]}>
                  {fmt.month}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Legenda platebního stavu */}
      <View style={s.legend}>
        {(Object.keys(PAYMENT_BG) as (keyof typeof PAYMENT_BG)[]).map(k => (
          <View key={k} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: PAYMENT_BG[k] }]} />
            <Text style={s.legendText}>{PAYMENT_LABEL[k]}</Text>
          </View>
        ))}
        <Text style={s.legendCount}>{dayBooks.length} rezervací</Text>
      </View>

      {/* Časová osa */}
      <View style={[s.timelineWrapper, { height: timelineH }]}>

        {/* Pevný levý sloupec — názvy kurtů */}
        <View style={s.courtNamesCol}>
          <View style={[s.cornerCell]} />
          {courts.map(court => {
            const accent = SPORT_COLORS[court.sport] ?? W.orange;
            return (
              <View key={court.id} style={[s.courtNameCell, { borderLeftColor: accent }]}>
                <Text numberOfLines={1} style={s.courtNameText}>{court.name}</Text>
                <Text numberOfLines={1} style={s.courtSportText}>
                  {SPORT_LABELS[court.sport]}
                </Text>
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
            style={{ height: courts.length * ROW_H }}
            showsHorizontalScrollIndicator
            onScroll={e => {
              const x = e.nativeEvent.contentOffset.x;
              scrollXRef.current = x;
              scrollXAnim.setValue(x);
            }}
            scrollEventThrottle={16}
          >
            <View style={{ width: timelineWidth, height: courts.length * ROW_H, position: 'relative' }}>

              {/* Pozadí řad kurtů — střídavé pruhy */}
              {courts.map((_, i) => (
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
              {courts.map((_, i) => (
                <View key={i} style={[s.gridHLine, { top: (i + 1) * ROW_H - 1 }]} />
              ))}

              {/* Drop target — přesná pozice a velikost cílového slotu */}
              {draggingId && (() => {
                const info = bookingInfoRef.current[draggingId];
                if (!info) return null;
                const rowDelta    = Math.round(dragOffsetY / ROW_H);
                const slotDelta   = Math.round(dragOffsetX / SLOT_W);
                const targetRow   = Math.max(0, Math.min(courts.length - 1, info.courtIdx + rowDelta));
                const targetSlot  = Math.max(0, Math.min(SLOT_COUNT - info.slotCount, info.slotMin + slotDelta));
                const posInVis    = targetSlot - settings.openingSlot;
                // Barva dle konfliktu
                const othersOnTarget = dayBooks.filter(b =>
                  b.id !== draggingId && b.court_id === courts[targetRow]?.id
                );
                const newSlots = Array.from({ length: info.slotCount }, (_, i) => targetSlot + i);
                const hasConflict = newSlots.some(s => othersOnTarget.some(ob => ob.slots.includes(s)));
                return (
                  <View style={[s.dropTarget, {
                    top:    targetRow * ROW_H + 3,
                    left:   posInVis * SLOT_W + 2,
                    width:  info.slotCount * SLOT_W - 4,
                    height: ROW_H - 6,
                    borderColor: hasConflict ? '#EF4444' : 'rgba(99,102,241,0.6)',
                    backgroundColor: hasConflict ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.1)',
                  }]} />
                );
              })()}

              {/* Provozní doba — šedé bloky mimo otevírací dobu */}
              {courts.map((court, ci) => {
                const closingPos = (settings.closingSlot - settings.openingSlot + 1) * SLOT_W;
                return (
                  <View key={`closed-${ci}`} style={[
                    s.closedOverlay,
                    { top: ci * ROW_H, left: closingPos, right: 0, height: ROW_H - 1 }
                  ]} />
                );
              })}

              {/* Rezervační bloky */}
              {dayBooks.map(booking => {
                const courtIdx = courts.findIndex(c => c.id === booking.court_id);
                if (courtIdx === -1) return null;

                const slotMin    = Math.min(...booking.slots);
                const slotCount  = booking.slots.length;
                const isDragging = draggingId === booking.id;

                const posInVisible = slotMin - settings.openingSlot;
                const rawLeft      = posInVisible * SLOT_W;
                const displayLeft  = rawLeft + (isDragging ? dragOffsetX : 0);
                const displayTop   = courtIdx * ROW_H + (isDragging ? dragOffsetY : 0);
                const bgColor      = PAYMENT_BG[booking.payment_status] ?? '#94A3B8';

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
                        opacity:   isDragging ? 0.82 : 1,
                        zIndex:    isDragging ? 20 : 1,
                        elevation: isDragging ? 8 : 2,
                      },
                    ]}
                    {...(panResponders[booking.id]?.panHandlers ?? {})}
                  >
                    {/* TouchableOpacity pro tap→detail; po dragu ignoruje onPress díky justDraggedRef */}
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => {
                        if (justDraggedRef.current.has(booking.id)) {
                          justDraggedRef.current.delete(booking.id);
                          return;
                        }
                        setSelectedBooking(booking);
                      }}
                      style={[s.bookingInner, { backgroundColor: bgColor }]}
                    >
                      <Text numberOfLines={1} style={s.bookingName}>
                        {booking.player_name}
                      </Text>
                      <Text numberOfLines={1} style={s.bookingMeta}>
                        {slotToTime(slotMin)}–{slotEndTime(Math.max(...booking.slots))}
                        {slotCount >= 2 ? ` · ${booking.price} Kč` : ''}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>

      <Text style={s.dragHint}>Táhněte blok rezervace pro přesunutí · klepněte pro detail</Text>

      {/* Detail rezervace */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          court={courts.find(c => c.id === selectedBooking.court_id) ?? null}
          onClose={() => setSelectedBooking(null)}
          onUpdatePayment={(status) => {
            updateBooking(selectedBooking.id, { payment_status: status });
            setSelectedBooking(prev => prev ? { ...prev, payment_status: status } : null);
          }}
          onCancel={() => {
            updateBooking(selectedBooking.id, { status: 'cancelled' });
            setSelectedBooking(null);
          }}
        />
      )}
    </ScrollView>
  );
}

// ─── Detail rezervace (popup) ─────────────────────────────────────────────────

function BookingDetailModal({ booking, court, onClose, onUpdatePayment, onCancel }: {
  booking: ClubBooking;
  court: CourtWithClub | null;
  onClose: () => void;
  onUpdatePayment: (status: 'paid' | 'pay_on_site' | 'pending') => void;
  onCancel: () => void;
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const accent    = SPORT_COLORS[court?.sport ?? 'tennis'] ?? W.orange;
  const slotMin   = Math.min(...booking.slots);
  const slotMax   = Math.max(...booking.slots);
  const bgColor   = PAYMENT_BG[booking.payment_status];

  // Formátování data
  const dateObj = new Date(booking.date + 'T12:00:00');
  const fmt     = fmtDay(dateObj);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.detailOverlay}>
        <View style={s.detailSheet}>
          <View style={s.modalHandle} />

          {/* Hlavička — barva platby */}
          <View style={[s.detailHeader, { backgroundColor: bgColor }]}>
            <View style={{ flex: 1 }}>
              <View style={s.detailPayBadge}>
                <Text style={s.detailPayBadgeText}>{PAYMENT_LABEL[booking.payment_status]}</Text>
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
              <DetailRow icon="calendar-outline" label="Datum"
                value={`${fmt.short} ${fmt.num}. ${fmt.month} ${dateObj.getFullYear()}`} />
              <DetailRow icon="time-outline" label="Čas"
                value={`${slotToTime(slotMin)} – ${slotEndTime(slotMax)}`} />
              <DetailRow icon="hourglass-outline" label="Trvání"
                value={`${booking.slots.length * 30} min`} />
              <DetailRow icon="location-outline" label="Kurt"
                value={court?.name ?? booking.court_id} />
              <DetailRow icon="cash-outline" label="Cena"
                value={`${booking.price} Kč`} accent={accent} />
            </View>

            {/* Změna platebního stavu */}
            <Text style={s.detailSectionLabel}>PLATEBNÍ STAV</Text>
            <View style={s.detailPayRow}>
              {(Object.keys(PAYMENT_BG) as (keyof typeof PAYMENT_BG)[]).map(k => (
                <TouchableOpacity
                  key={k}
                  onPress={() => onUpdatePayment(k as any)}
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

            {/* Zrušení */}
            {!confirmCancel ? (
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
// TAB: KURTY — správa detailů
// ═══════════════════════════════════════════════════════════════════════════════

function CourtsTab({ hook }: { hook: ReturnType<typeof useClubBookings> }) {
  const { courts, updateCourt } = hook;
  const [editingCourt, setEditingCourt] = useState<CourtWithClub | null>(null);

  return (
    <ScrollView contentContainerStyle={s.courtList}>
      <Text style={s.sectionTitle}>KURTY A SPORTOVIŠTĚ</Text>
      {courts.map(court => {
        const accent = SPORT_COLORS[court.sport] ?? W.orange;
        return (
          <View key={court.id} style={s.courtRow}>
            <View style={[s.courtRowBar, { backgroundColor: accent }]} />
            <View style={s.courtRowInfo}>
              <Text style={s.courtRowName}>{court.name}</Text>
              <Text style={s.courtRowMeta}>
                {SPORT_LABELS[court.sport]} · {SURFACE_LABELS[court.surface]}
                {' · '}{court.is_indoor ? 'Hala' : 'Venkovní'}
                {' · '}{court.price_per_hour} Kč/hod
                {' · '}max {court.capacity} hráčů
              </Text>
              <Text style={s.courtRowClub}>{court.club_name}, {court.club_city}</Text>
            </View>
            <TouchableOpacity onPress={() => setEditingCourt(court)} style={s.editIconBtn}>
              <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        );
      })}

      {editingCourt && (
        <CourtEditModal
          court={editingCourt}
          onSave={(updates) => { updateCourt(editingCourt.id, updates); setEditingCourt(null); }}
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

function CourtEditModal({ court, onSave, onClose }: {
  court: CourtWithClub;
  onSave: (updates: Partial<CourtWithClub>) => void;
  onClose: () => void;
}) {
  const [name,     setName]     = useState(court.name);
  const [sport,    setSport]    = useState<SportType>(court.sport);
  const [surface,  setSurface]  = useState<CourtSurface>(court.surface);
  const [isIndoor, setIsIndoor] = useState(court.is_indoor);
  const [price,    setPrice]    = useState(String(court.price_per_hour));
  const [capacity, setCapacity] = useState(court.capacity);

  const accent = SPORT_COLORS[sport] ?? W.orange;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={[s.modalBar, { backgroundColor: accent }]} />
            <View style={s.modalBody}>
              <Text style={s.modalTitle}>UPRAVIT KURT</Text>

              <Text style={s.fieldLabel}>NÁZEV KURTU</Text>
              <TextInput
                style={s.fieldInput}
                value={name}
                onChangeText={setName}
                placeholder="Název kurtu"
                placeholderTextColor={colors.textDisabled}
              />

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

              <Text style={s.fieldLabel}>CENA (Kč / hodina)</Text>
              <TextInput
                style={s.fieldInput}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                placeholder="250"
                placeholderTextColor={colors.textDisabled}
              />

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

              <TouchableOpacity
                onPress={() => onSave({
                  name, sport, surface, is_indoor: isIndoor,
                  price_per_hour: Number(price) || court.price_per_hour,
                  capacity,
                })}
                style={[s.saveBtn, { backgroundColor: accent }]}
              >
                <Text style={s.saveBtnText}>ULOŽIT ZMĚNY</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={s.cancelModalBtn}>
                <Text style={s.cancelModalText}>Zrušit</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: NASTAVENÍ
// ═══════════════════════════════════════════════════════════════════════════════

const LOCK_OPTIONS = [0, 1, 2, 4, 8, 12, 24, 48, 72];
const SLOT_OPTIONS = ALL_SLOTS; // 0–29

function SettingsTab({ hook }: { hook: ReturnType<typeof useClubBookings> }) {
  const { settings, updateSettings } = hook;

  return (
    <ScrollView contentContainerStyle={s.settingsList}>
      <Text style={s.sectionTitle}>NASTAVENÍ KLUBU</Text>

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

      {/* Provozní doba */}
      <View style={s.settingCard}>
        <View style={[s.settingCardBar, { backgroundColor: W.amber }]} />
        <View style={s.settingCardBody}>
          <Text style={s.settingCardTitle}>Provozní doba</Text>
          <Text style={s.settingCardSub}>
            {slotToTime(settings.openingSlot)} – {slotEndTime(settings.closingSlot)}
          </Text>
          <View style={s.openingRow}>
            <View style={s.openingCol}>
              <Text style={s.openingLabel}>OTEVÍRACÍ DOBA</Text>
              <View style={s.stepperRow}>
                <TouchableOpacity
                  onPress={() => updateSettings({ openingSlot: Math.max(0, settings.openingSlot - 1) })}
                  style={[s.stepperBtn, { backgroundColor: W.amber }]}>
                  <Text style={s.stepperBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={s.stepperValue}>{slotToTime(settings.openingSlot)}</Text>
                <TouchableOpacity
                  onPress={() => updateSettings({ openingSlot: Math.min(settings.closingSlot - 1, settings.openingSlot + 1) })}
                  style={[s.stepperBtn, { backgroundColor: W.amber }]}>
                  <Text style={s.stepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={s.openingCol}>
              <Text style={s.openingLabel}>ZAVÍRACÍ DOBA</Text>
              <View style={s.stepperRow}>
                <TouchableOpacity
                  onPress={() => updateSettings({ closingSlot: Math.max(settings.openingSlot + 1, settings.closingSlot - 1) })}
                  style={[s.stepperBtn, { backgroundColor: W.amber }]}>
                  <Text style={s.stepperBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={s.stepperValue}>{slotEndTime(settings.closingSlot)}</Text>
                <TouchableOpacity
                  onPress={() => updateSettings({ closingSlot: Math.min(SLOT_COUNT - 1, settings.closingSlot + 1) })}
                  style={[s.stepperBtn, { backgroundColor: W.amber }]}>
                  <Text style={s.stepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Info tile — budoucí nastavení */}
      <View style={[s.settingCard, { opacity: 0.5 }]}>
        <View style={[s.settingCardBar, { backgroundColor: colors.textDisabled }]} />
        <View style={s.settingCardBody}>
          <Text style={s.settingCardTitle}>Cenové kategorie</Text>
          <Text style={s.settingCardSub}>Nastavení různých cen podle dne / hodiny — připravujeme</Text>
        </View>
      </View>

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

  // Date picker
  datePicker: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  datePickerContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  dayChip: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border, minWidth: 50 },
  dayChipActive: { backgroundColor: W.orange, borderColor: W.orange },
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
  courtNameCell: { height: ROW_H, justifyContent: 'center', paddingLeft: 8, paddingRight: 4, borderBottomWidth: 1, borderBottomColor: colors.border, borderLeftWidth: 3, borderLeftColor: 'transparent' },
  courtNameText: { fontSize: 12, fontWeight: '800', color: colors.textPrimary },
  courtSportText: { fontSize: 10, color: colors.textMuted, marginTop: 2 },

  // Záhlaví s časem
  timeHeaderCell: { width: SLOT_W, height: HEADER_H, justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 4, borderRightWidth: 1, borderRightColor: colors.border, borderBottomWidth: 1, borderBottomColor: colors.border },
  timeHeaderText: { fontSize: 10, fontWeight: '700', color: colors.textMuted },

  // Mřížka
  gridVLine:    { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: colors.border },
  gridHLine:    { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.border },
  closedOverlay: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.04)' },
  dropTarget:   { position: 'absolute', backgroundColor: 'rgba(99,102,241,0.12)', borderWidth: 2, borderColor: 'rgba(99,102,241,0.4)', borderStyle: 'dashed' },

  // Rezervační blok
  bookingBlock: { position: 'absolute', overflow: 'hidden' },
  bookingInner: { flex: 1, paddingHorizontal: 6, paddingVertical: 5, justifyContent: 'center' },
  bookingName:  { fontSize: 11, fontWeight: '800', color: '#fff', lineHeight: 15 },
  bookingMeta:  { fontSize: 9,  color: 'rgba(255,255,255,0.85)', marginTop: 1 },

  dragHint: { fontSize: 10, color: colors.textDisabled, textAlign: 'center', paddingVertical: 6, fontStyle: 'italic' },

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
  detailRowLabel: { fontSize: 13, color: colors.textMuted, width: 64 },
  detailRowValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  detailSectionLabel: { fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 1.5, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
  detailPayRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, flexWrap: 'wrap' },
  detailPayChip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2 },
  detailPayChipText: { fontSize: 11, fontWeight: '800' },
  detailCancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, marginTop: 20, padding: 14, borderWidth: 1, borderColor: colors.error },
  detailCancelText: { fontSize: 13, fontWeight: '700', color: colors.error },
  detailConfirmCancel: { margin: 16, marginTop: 20, padding: 16, backgroundColor: '#FEE2E2', gap: 12 },
  detailConfirmText: { fontSize: 14, fontWeight: '700', color: colors.error },
  detailConfirmBtns: { flexDirection: 'row', gap: 10 },
  detailConfirmNo: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  detailConfirmNoText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  detailConfirmYes: { flex: 2, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.error },
  detailConfirmYesText: { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 1 },
});
