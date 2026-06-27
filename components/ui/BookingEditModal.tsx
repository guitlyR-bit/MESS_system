/**
 * BookingEditModal — modal pro editaci rezervace
 *
 * Flow A: Změna času   → DatePicker + SlotGrid (stejný kurt)
 * Flow B: Změna kurtu  → Kurty stejného sportoviště → Datum + sloty
 * Flow C: Zrušení      → Potvrzení
 */

import { useState } from 'react';
import {
  Modal, View, Text, ScrollView,
  TouchableOpacity, StyleSheet, Pressable, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';
import { useClubSettings } from '@/hooks/useClubSettings';
import {
  MOCK_COURTS,
  ALL_SLOTS, slotToTime, slotEndTime, slotDuration, slotPrice,
  getNext14Days, fmtDay,
  SPORT_LABELS, SURFACE_LABELS,
} from '@/lib/mockData';
import type { BookingWithCourt, CourtWithClub } from '@/types/database';

const W = colors.warm;

const SPORT_COLORS: Record<string, string> = {
  tennis: W.orange, badminton: W.rose, squash: W.red,
  padel: W.amber, volleyball: W.yellow, basketball: W.orange, football: W.pink,
};

type ModalView =
  | 'options'        // výchozí: 3 možnosti
  | 'cancel_confirm' // potvrzení zrušení
  | 'time'           // Změna času — slot picker
  | 'court_courts'   // Změna kurtu — kurty stejného sportoviště
  | 'court_slots'    // Změna kurtu — slot picker nového kurtu
  | 'done';          // hotovo

interface Props {
  booking: BookingWithCourt | null;
  visible: boolean;
  onClose: () => void;
  onCancel:  (bookingId: string) => void;
  onEdit: (bookingId: string, params: {
    courtId?: string; courtName?: string; courtSport?: string;
    clubName?: string; clubCity?: string;
    date: string; slots: number[]; price: number;
    note?: string;
  }) => void;
  getBookedSlotsExcluding: (courtId: string, date: string, bookingId: string) => number[];
}

export function BookingEditModal({
  booking, visible, onClose,
  onCancel, onEdit, getBookedSlotsExcluding,
}: Props) {
  const clubSettings = useClubSettings();
  const minBookingDurationMinutes = clubSettings.minBookingDurationMinutes;
  const minSlotCount = minBookingDurationMinutes / 30;

  const [view, setView]               = useState<ModalView>('options');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<CourtWithClub | null>(null);
  const [doneMessage, setDoneMessage]   = useState('');
  const [note, setNote]                 = useState(booking?.notes ?? '');

  // Sportoviště/klub aktuální rezervace — pro filtrování kurtů
  const currentClubId = MOCK_COURTS.find(c => c.id === booking?.court_id)?.club_id ?? '';

  if (!booking) return null;

  const accent = SPORT_COLORS[booking.court_sport] ?? W.orange;

  function resetAndClose() {
    setView('options');
    setSelectedDate(new Date());
    setSelectedSlots([]);
    setSelectedCourt(null);
    onClose();
  }

  // ── Zrušení ────────────────────────────────────────────────────────────────

  function handleCancel() {
    onCancel(booking!.id);
    setDoneMessage('Rezervace byla zrušena.');
    setView('done');
  }

  // ── Potvrzení změny času ────────────────────────────────────────────────────

  function handleSaveTime() {
    if (selectedSlots.length === 0) return;
    if (selectedSlots.length * 30 < minBookingDurationMinutes) return;
    const dateKey = selectedDate.toISOString().slice(0, 10);
    onEdit(booking!.id, {
      date:  dateKey,
      slots: selectedSlots,
      price: slotPrice(selectedSlots.length, /* pricePerHour */ getPricePerHour()),
      note:  note.trim() || undefined,
    });
    setDoneMessage('Čas rezervace byl změněn.');
    setView('done');
  }

  function getPricePerHour(): number {
    const court = MOCK_COURTS.find(c => c.id === booking!.court_id);
    return court?.price_per_hour ?? booking!.price;
  }

  // ── Potvrzení změny kurtu ───────────────────────────────────────────────────

  function handleSaveCourt() {
    if (!selectedCourt || selectedSlots.length === 0) return;
    if (selectedSlots.length * 30 < minBookingDurationMinutes) return;
    const dateKey = selectedDate.toISOString().slice(0, 10);
    onEdit(booking!.id, {
      courtId:    selectedCourt.id,
      courtName:  selectedCourt.name,
      courtSport: selectedCourt.sport,
      clubName:   selectedCourt.club_name,
      clubCity:   selectedCourt.club_city,
      date:       dateKey,
      slots:      selectedSlots,
      price:      slotPrice(selectedSlots.length, selectedCourt.price_per_hour),
      note:       note.trim() || undefined,
    });
    setDoneMessage('Kurt a čas rezervace byly změněny.');
    setView('done');
  }

  // ── Slot toggling (identická logika jako v courts.tsx) ─────────────────────

  function handleSlotPress(
    idx: number,
    bookedNow: number[],
    slots: number[],
    setSlots: (s: number[]) => void
  ) {
    if (bookedNow.includes(idx)) return;
    if (slots.length === 0) { setSlots([idx]); return; }
    const selMin = Math.min(...slots);
    const selMax = Math.max(...slots);
    if (idx === selMin && slots.length > 1) {
      if (slots.length - 1 >= minSlotCount) { setSlots(slots.filter(s => s !== selMin)); return; }
      return;
    }
    if (idx === selMax && slots.length > 1) {
      if (slots.length - 1 >= minSlotCount) { setSlots(slots.filter(s => s !== selMax)); return; }
      return;
    }
    if (idx === selMax + 1 && !bookedNow.includes(idx)) { setSlots([...slots, idx]); return; }
    if (idx === selMin - 1 && !bookedNow.includes(idx)) { setSlots([idx, ...slots]); return; }
    setSlots([idx]);
  }

  // ══════════════════════════════════════════════════════════════════════════

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={resetAndClose}>
      <Pressable style={s.overlay} onPress={resetAndClose}>
        <Pressable style={s.sheet} onPress={() => {}}>

          {/* Táhlo */}
          <View style={s.handle} />

          {/* ── OPTIONS ──────────────────────────────────────────────────── */}
          {view === 'options' && (
            <OptionsView
              booking={booking}
              accent={accent}
              note={note}
              onNoteChange={setNote}
              onChangeTime={() => {
                setSelectedDate(new Date(booking.starts_at));
                setSelectedSlots(booking.slots ?? []);
                setView('time');
              }}
              onChangeCourt={() => {
                setSelectedCourt(null);
                setSelectedSlots([]);
                setSelectedDate(new Date());
                setView('court_courts');
              }}
              onCancel={() => setView('cancel_confirm')}
              onClose={resetAndClose}
            />
          )}

          {/* ── CANCEL CONFIRM ───────────────────────────────────────────── */}
          {view === 'cancel_confirm' && (
            <CancelConfirmView
              booking={booking}
              accent={accent}
              onConfirm={handleCancel}
              onBack={() => setView('options')}
            />
          )}

          {/* ── CHANGE TIME ──────────────────────────────────────────────── */}
          {view === 'time' && (
            <TimeEditView
              booking={booking}
              accent={accent}
              minBookingDurationMinutes={minBookingDurationMinutes}
              selectedDate={selectedDate}
              selectedSlots={selectedSlots}
              bookedSlots={getBookedSlotsExcluding(
                booking.court_id,
                selectedDate.toISOString().slice(0, 10),
                booking.id
              )}
              onSelectDate={(d) => { setSelectedDate(d); setSelectedSlots([]); }}
              onSlotPress={(idx, booked) =>
                handleSlotPress(idx, booked, selectedSlots, setSelectedSlots)
              }
              onSave={handleSaveTime}
              onBack={() => setView('options')}
            />
          )}

          {/* ── CHANGE COURT: COURTS (v rámci stejného sportoviště) ─────── */}
          {view === 'court_courts' && (
            <CourtPickView
              clubId={currentClubId}
              currentCourtId={booking.court_id}
              onSelect={(c) => {
                setSelectedCourt(c);
                setSelectedSlots([]);
                setSelectedDate(new Date());
                setView('court_slots');
              }}
              onBack={() => setView('options')}
            />
          )}

          {/* ── CHANGE COURT: SLOTS ──────────────────────────────────────── */}
          {view === 'court_slots' && selectedCourt && (
            <CourtSlotsView
              court={selectedCourt}
              minBookingDurationMinutes={minBookingDurationMinutes}
              selectedDate={selectedDate}
              selectedSlots={selectedSlots}
              bookedSlots={getBookedSlotsExcluding(
                selectedCourt.id,
                selectedDate.toISOString().slice(0, 10),
                booking.id
              )}
              onSelectDate={(d) => { setSelectedDate(d); setSelectedSlots([]); }}
              onSlotPress={(idx, booked) =>
                handleSlotPress(idx, booked, selectedSlots, setSelectedSlots)
              }
              onSave={handleSaveCourt}
              onBack={() => setView('court_courts')}
            />
          )}

          {/* ── DONE ─────────────────────────────────────────────────────── */}
          {view === 'done' && (
            <DoneView message={doneMessage} accent={accent} onClose={resetAndClose} />
          )}

        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Ikonka půlky kurtu (bílé čáry) ─────────────────────────────────────────

function CourtHalfIcon({ size = 22, color = '#fff' }: { size?: number; color?: string }) {
  // Obdélník = kurtu, vodorovná čára = síť (uprostřed),
  // svislá čára = osa podání (v horní polovině)
  const w  = size * 1.1;
  const h  = size;
  const lw = Math.max(1.5, size * 0.07); // tloušťka čar

  return (
    <View style={{ width: w, height: h }}>
      {/* Vnější ohraničení */}
      <View style={{
        position: 'absolute', inset: 0,
        borderWidth: lw, borderColor: color,
      }} />
      {/* Síť — vodorovná čára v polovině výšky */}
      <View style={{
        position: 'absolute',
        top: h / 2 - lw / 2,
        left: 0, right: 0,
        height: lw, backgroundColor: color,
      }} />
      {/* Osa podání — svislá čára v horní polovině */}
      <View style={{
        position: 'absolute',
        top: 0,
        bottom: h / 2,
        left: w / 2 - lw / 2,
        width: lw, backgroundColor: color,
      }} />
    </View>
  );
}

// ─── OPTIONS ─────────────────────────────────────────────────────────────────

function OptionsView({ booking, accent, note, onNoteChange, onChangeTime, onChangeCourt, onCancel, onClose }: {
  booking: BookingWithCourt; accent: string;
  note: string; onNoteChange: (v: string) => void;
  onChangeTime: () => void; onChangeCourt: () => void;
  onCancel: () => void; onClose: () => void;
}) {
  const start = new Date(booking.starts_at);
  const fmt   = fmtDay(start);
  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <View style={s.section}>
        <Text style={s.sheetTitle}>UPRAVIT REZERVACI</Text>

        {/* Mini shrnutí */}
        <View style={[s.summaryBox, { borderLeftColor: accent }]}>
          <Text style={s.summaryName}>{booking.court_name}</Text>
          <Text style={s.summarySub}>{booking.club_name}</Text>
          <Text style={s.summarySub}>
            {fmt.short} {fmt.num}. {fmt.month} · {booking.price} Kč
          </Text>
        </View>

        {/* Pole pro poznámku */}
        <View style={s.noteSection}>
          <Text style={s.noteLabel}>POZNÁMKA</Text>
          <TextInput
            style={s.noteInput}
            value={note}
            onChangeText={onNoteChange}
            placeholder="Přidat poznámku..."
            placeholderTextColor={colors.textDisabled}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity onPress={onChangeTime} style={s.optionBtn}>
          <View style={[s.optionIcon, { backgroundColor: accent }]}>
            <Ionicons name="time-outline" size={22} color="#fff" />
          </View>
          <View style={s.optionText}>
            <Text style={s.optionTitle}>Změnit čas</Text>
            <Text style={s.optionSub}>Vyberte jiný datum nebo čas na stejném kurtu</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.borderStrong} />
        </TouchableOpacity>

        <TouchableOpacity onPress={onChangeCourt} style={s.optionBtn}>
          <View style={[s.optionIcon, { backgroundColor: accent }]}>
            <CourtHalfIcon size={22} color="#fff" />
          </View>
          <View style={s.optionText}>
            <Text style={s.optionTitle}>Změnit kurt</Text>
            <Text style={s.optionSub}>Vyberte jiný kurt na tomto sportovišti</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.borderStrong} />
        </TouchableOpacity>

        <TouchableOpacity onPress={onCancel} style={[s.optionBtn, s.optionBtnDanger]}>
          <View style={[s.optionIcon, { backgroundColor: colors.error }]}>
            <Ionicons name="close-outline" size={24} color="#fff" />
          </View>
          <View style={s.optionText}>
            <Text style={[s.optionTitle, { color: colors.error }]}>Zrušit rezervaci</Text>
            <Text style={s.optionSub}>Tato akce je nevratná</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <Text style={s.closeBtnText}>Zavřít</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── CANCEL CONFIRM ───────────────────────────────────────────────────────────

function CancelConfirmView({ booking, accent, onConfirm, onBack }: {
  booking: BookingWithCourt; accent: string;
  onConfirm: () => void; onBack: () => void;
}) {
  return (
    <View style={s.section}>
      <Text style={s.sheetTitle}>ZRUŠIT REZERVACI?</Text>
      <View style={[s.summaryBox, { borderLeftColor: colors.error }]}>
        <Text style={s.summaryName}>{booking.court_name}</Text>
        <Text style={s.summarySub}>{booking.club_name} · {booking.price} Kč</Text>
      </View>
      <Text style={s.warningText}>
        Rezervace bude trvale zrušena. Tuto akci nelze vrátit zpět.
      </Text>
      <TouchableOpacity onPress={onConfirm} style={s.dangerBtn}>
        <Text style={s.dangerBtnText}>ANO, ZRUŠIT REZERVACI</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onBack} style={s.closeBtn}>
        <Text style={s.closeBtnText}>Zpět</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── TIME EDIT ────────────────────────────────────────────────────────────────

function TimeEditView({ booking, accent, minBookingDurationMinutes, selectedDate, selectedSlots, bookedSlots,
  onSelectDate, onSlotPress, onSave, onBack }: {
  booking: BookingWithCourt; accent: string;
  minBookingDurationMinutes: number;
  selectedDate: Date; selectedSlots: number[]; bookedSlots: number[];
  onSelectDate: (d: Date) => void;
  onSlotPress: (idx: number, booked: number[]) => void;
  onSave: () => void; onBack: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={s.sectionHeader}>
        <TouchableOpacity onPress={onBack}><Text style={s.backTxt}>← Zpět</Text></TouchableOpacity>
        <Text style={s.sheetTitle}>ZMĚNIT ČAS</Text>
      </View>

      <View style={[s.summaryBox, { borderLeftColor: accent, marginHorizontal: 16 }]}>
        <Text style={s.summaryName}>{booking.court_name}</Text>
        <Text style={s.summarySub}>{booking.club_name}</Text>
      </View>

      <SlotPicker
        accent={accent}
        minBookingDurationMinutes={minBookingDurationMinutes}
        selectedDate={selectedDate}
        selectedSlots={selectedSlots}
        bookedSlots={bookedSlots}
        onSelectDate={onSelectDate}
        onSlotPress={onSlotPress}
        pricePerHour={MOCK_COURTS.find(c => c.id === booking.court_id)?.price_per_hour ?? booking.price}
        onConfirm={onSave}
        confirmLabel="ULOŽIT ZMĚNU ČASU"
      />
    </View>
  );
}

// ─── COURT PICK (v rámci stejného sportoviště) ───────────────────────────────

function CourtPickView({ clubId, currentCourtId, onSelect, onBack }: {
  clubId: string; currentCourtId: string;
  onSelect: (c: CourtWithClub) => void; onBack: () => void;
}) {
  const courts    = MOCK_COURTS.filter(c => c.club_id === clubId);
  const clubName  = courts[0]?.club_name ?? '';
  return (
    <View style={{ flex: 1 }}>
      <View style={s.sectionHeader}>
        <TouchableOpacity onPress={onBack}><Text style={s.backTxt}>← Zpět</Text></TouchableOpacity>
        <Text style={s.sheetTitle}>{clubName.toUpperCase()}</Text>
      </View>
      <ScrollView>
        {courts.map(court => {
          const col    = SPORT_COLORS[court.sport] ?? W.orange;
          const isSame = court.id === currentCourtId;
          return (
            <TouchableOpacity key={court.id} onPress={() => onSelect(court)}
              style={[s.pickRow, isSame && s.pickRowCurrent]} activeOpacity={0.8}>
              <View style={[s.pickDot, { backgroundColor: col }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.pickName}>
                  {court.name}{isSame ? '  ✓ aktuální' : ''}
                </Text>
                <Text style={s.pickSub}>
                  {SURFACE_LABELS[court.surface]} · {court.price_per_hour} Kč/hod
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.borderStrong} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── COURT SLOTS ─────────────────────────────────────────────────────────────

function CourtSlotsView({ court, minBookingDurationMinutes, selectedDate, selectedSlots, bookedSlots,
  onSelectDate, onSlotPress, onSave, onBack }: {
  court: CourtWithClub; minBookingDurationMinutes: number;
  selectedDate: Date; selectedSlots: number[]; bookedSlots: number[];
  onSelectDate: (d: Date) => void;
  onSlotPress: (idx: number, booked: number[]) => void;
  onSave: () => void; onBack: () => void;
}) {
  const accent = SPORT_COLORS[court.sport] ?? W.orange;
  return (
    <View style={{ flex: 1 }}>
      <View style={s.sectionHeader}>
        <TouchableOpacity onPress={onBack}><Text style={s.backTxt}>← Zpět</Text></TouchableOpacity>
        <Text style={s.sheetTitle}>VYBERTE ČAS</Text>
      </View>
      <View style={[s.summaryBox, { borderLeftColor: accent, marginHorizontal: 16 }]}>
        <Text style={s.summaryName}>{court.name}</Text>
        <Text style={s.summarySub}>{court.club_name} · {court.price_per_hour} Kč/hod</Text>
      </View>
      <SlotPicker
        accent={accent}
        minBookingDurationMinutes={minBookingDurationMinutes}
        selectedDate={selectedDate}
        selectedSlots={selectedSlots}
        bookedSlots={bookedSlots}
        onSelectDate={onSelectDate}
        onSlotPress={onSlotPress}
        pricePerHour={court.price_per_hour}
        onConfirm={onSave}
        confirmLabel="ULOŽIT NOVÝ KURT A ČAS"
      />
    </View>
  );
}

// ─── SHARED: SLOT PICKER ─────────────────────────────────────────────────────

function SlotPicker({ accent, minBookingDurationMinutes, selectedDate, selectedSlots, bookedSlots,
  onSelectDate, onSlotPress, pricePerHour, onConfirm, confirmLabel }: {
  accent: string; minBookingDurationMinutes: number;
  selectedDate: Date; selectedSlots: number[]; bookedSlots: number[];
  onSelectDate: (d: Date) => void;
  onSlotPress: (idx: number, booked: number[]) => void;
  pricePerHour: number; onConfirm: () => void; confirmLabel: string;
}) {
  const days    = getNext14Days();
  const dateKey = selectedDate.toISOString().slice(0, 10);
  const selMin  = selectedSlots.length > 0 ? Math.min(...selectedSlots) : -1;
  const selMax  = selectedSlots.length > 0 ? Math.max(...selectedSlots) : -1;
  const durationMinutes = selectedSlots.length * 30;
  const belowMin = selectedSlots.length > 0 && durationMinutes < minBookingDurationMinutes;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Výběr dne */}
      <Text style={s.sectionLabel}>DATUM</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.dayRow}>
        {days.map((day, i) => {
          const fmt        = fmtDay(day);
          const isSelected = day.toISOString().slice(0, 10) === dateKey;
          return (
            <TouchableOpacity key={i} onPress={() => onSelectDate(day)}
              style={[s.dayChip, isSelected && { backgroundColor: accent }]}>
              <Text style={[s.dayWeek, isSelected && { color: '#fff' }]}>
                {i === 0 ? 'DNES' : fmt.short}
              </Text>
              <Text style={[s.dayNum, isSelected && { color: '#fff' }]}>{fmt.num}</Text>
              <Text style={[s.dayMonth, isSelected && { color: 'rgba(255,255,255,0.7)' }]}>
                {fmt.month}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Sloty */}
      <Text style={s.sectionLabel}>VOLNÉ TERMÍNY</Text>
      <Text style={s.minDurationHint}>Minimální doba: {minBookingDurationMinutes} min</Text>
      <View style={s.slotGrid}>
        {ALL_SLOTS.map(idx => {
          const isBooked   = bookedSlots.includes(idx);
          const isSelected = selectedSlots.includes(idx);
          return (
            <TouchableOpacity key={idx} disabled={isBooked}
              onPress={() => onSlotPress(idx, bookedSlots)}
              style={[
                s.slot,
                isBooked   && s.slotBooked,
                isSelected && { backgroundColor: accent, borderColor: accent },
              ]}>
              <Text style={[s.slotTime,
                isBooked   && s.slotTimeDim,
                isSelected && { color: '#fff' },
              ]}>
                {slotToTime(idx)}
              </Text>
              {isBooked && <Text style={s.slotSub}>obsaz.</Text>}
              {!isBooked && !isSelected && <Text style={s.slotSub}>30 min</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Souhrn + tlačítko */}
      {selectedSlots.length > 0 && (
        <View style={s.confirmWrap}>
          <View style={[s.confirmSummary, { borderColor: accent }]}>
            <SummaryItem label="ČAS" value={`${slotToTime(selMin)} – ${slotEndTime(selMax)}`} />
            <View style={s.summaryDivider} />
            <SummaryItem label="TRVÁNÍ" value={slotDuration(selectedSlots.length)} />
            <View style={s.summaryDivider} />
            <SummaryItem label="CENA"
              value={`${slotPrice(selectedSlots.length, pricePerHour)} Kč`}
              accent={accent} />
          </View>
          <TouchableOpacity
            onPress={onConfirm}
            disabled={belowMin}
            activeOpacity={0.88}
            style={[s.confirmBtn, { backgroundColor: accent }, belowMin && { opacity: 0.45 }]}>
            <Text style={s.confirmBtnText}>{confirmLabel}</Text>
          </TouchableOpacity>
          {belowMin && (
            <Text style={s.minDurationError}>
              Vyberte alespoň {minBookingDurationMinutes} min ({slotDuration(minBookingDurationMinutes / 30)}).
            </Text>
          )}
        </View>
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function SummaryItem({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={s.summaryItem}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={[s.summaryValue, accent ? { color: accent, fontWeight: '800' } : {}]}>
        {value}
      </Text>
    </View>
  );
}

// ─── DONE ─────────────────────────────────────────────────────────────────────

function DoneView({ message, accent, onClose }: {
  message: string; accent: string; onClose: () => void;
}) {
  return (
    <View style={[s.section, { alignItems: 'center', paddingVertical: 40 }]}>
      <View style={[s.doneCheck, { backgroundColor: accent }]}>
        <Ionicons name="checkmark" size={36} color="#fff" />
      </View>
      <Text style={s.sheetTitle}>HOTOVO</Text>
      <Text style={[s.summarySub, { textAlign: 'center', marginBottom: 24 }]}>{message}</Text>
      <TouchableOpacity onPress={onClose} style={[s.confirmBtn, { backgroundColor: accent, width: '100%' }]}>
        <Text style={s.confirmBtnText}>ZAVŘÍT</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    maxHeight: '88%',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  handle: {
    width: 40, height: 4, backgroundColor: colors.border,
    alignSelf: 'center', marginTop: 12, marginBottom: 8,
  },

  section: { padding: 16, gap: 10 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backTxt:    { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  sheetTitle: { fontSize: 12, fontWeight: '900', color: colors.textPrimary, letterSpacing: 1.5 },

  summaryBox: {
    backgroundColor: colors.bgAlt, padding: 12,
    borderLeftWidth: 4, gap: 3,
  },
  summaryName: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  summarySub:  { fontSize: 12, color: colors.textMuted },

  noteSection: { gap: 6, marginTop: 4 },
  noteLabel: {
    fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 1,
  },
  noteInput: {
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: colors.textPrimary,
    backgroundColor: colors.bgAlt,
    minHeight: 72,
  },

  optionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  optionBtnDanger: { marginTop: 4 },
  optionIcon:  { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  optionText:  { flex: 1, gap: 2 },
  optionTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  optionSub:   { fontSize: 12, color: colors.textMuted },
  doneCheck:   { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },

  warningText: { fontSize: 13, color: colors.error, lineHeight: 20, marginVertical: 8 },
  dangerBtn:   { height: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.error },
  dangerBtnText: { fontSize: 13, fontWeight: '900', color: '#fff', letterSpacing: 1.5 },

  closeBtn:     { height: 48, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },

  // Venue / court picker
  pickRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  pickRowCurrent: { backgroundColor: colors.bgAlt },
  pickDot:  { width: 12, height: 12 },
  pickName: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  pickSub:  { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  // Slot picker
  sectionLabel: {
    fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 1.5,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  minDurationHint: {
    fontSize: 12, color: colors.textMuted,
    paddingHorizontal: 16, paddingBottom: 8,
  },
  minDurationError: {
    fontSize: 12, color: colors.error, textAlign: 'center',
  },
  dayRow: { paddingHorizontal: 14, paddingBottom: 4, gap: 8 },
  dayChip: {
    alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border, minWidth: 52,
  },
  dayWeek:  { fontSize: 9, fontWeight: '800', color: colors.textMuted, letterSpacing: 1 },
  dayNum:   { fontSize: 18, fontWeight: '900', color: colors.textPrimary, lineHeight: 24 },
  dayMonth: { fontSize: 10, color: colors.textMuted },

  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 4 },
  slot: {
    width: '23%', flexGrow: 1, alignItems: 'center', paddingVertical: 9,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 1,
  },
  slotBooked:  { backgroundColor: colors.bgAlt, borderColor: colors.border },
  slotTime:    { fontSize: 12, fontWeight: '800', color: colors.textPrimary },
  slotTimeDim: { color: colors.textDisabled },
  slotSub:     { fontSize: 9, color: colors.textMuted },

  confirmWrap: { padding: 16, paddingTop: 20, gap: 10 },
  confirmSummary: { flexDirection: 'row', borderWidth: 2, backgroundColor: colors.surface },
  summaryItem:   { flex: 1, alignItems: 'center', paddingVertical: 10 },
  summaryLabel:  { fontSize: 9, fontWeight: '800', color: colors.textMuted, letterSpacing: 1 },
  summaryValue:  { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: colors.border },
  confirmBtn:  { height: 56, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { fontSize: 13, fontWeight: '900', color: '#fff', letterSpacing: 1.5 },
});
