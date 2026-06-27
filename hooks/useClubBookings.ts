import { useState, useCallback, useEffect } from 'react';
import { getEffectiveClosingSlot } from '@/lib/clubClosure';
import { calculateSlotsPrice } from '@/lib/clubSchedule';
import { applySettingsPatch } from '@/lib/clubSeason';
import type { ClubBooking, ClubSettings, CourtWithClub, PaymentStatus } from '@/types/database';
import {
  createMockClubBookings,
  MOCK_COURTS,
  slotToTime,
  slotEndTime,
  SLOT_COUNT,
  localDateKey,
  slotPrice,
} from '@/lib/mockData';
import {
  getClubSettingsSnapshot,
  patchClubSettings,
  subscribeClubSettings,
} from '@/lib/clubSettingsState';

export function useClubBookings() {
  const [bookings, setBookings]   = useState<ClubBooking[]>(createMockClubBookings);
  const [settings, setSettings]   = useState(() => getClubSettingsSnapshot());

  useEffect(() => subscribeClubSettings(() => setSettings(getClubSettingsSnapshot())), []);
  const [courts,   setCourts]     = useState<CourtWithClub[]>(MOCK_COURTS);

  /** Přesune rezervaci na nový start slot, volitelně i na jiný kurt */
  const moveBooking = useCallback((
    bookingId: string,
    newStartSlot: number,
    newCourtId?: string,
  ) => {
    setBookings(prev => prev.map(b => {
      if (b.id !== bookingId) return b;
      const slotCount    = b.slots.length;
      const clampedStart = Math.max(0, Math.min(SLOT_COUNT - slotCount, newStartSlot));
      const newSlots     = Array.from({ length: slotCount }, (_, i) => clampedStart + i);
      const courtId      = newCourtId ?? b.court_id;
      return {
        ...b,
        court_id:  courtId,
        slots:     newSlots,
        starts_at: `${b.date}T${slotToTime(clampedStart)}:00.000Z`,
        ends_at:   `${b.date}T${slotEndTime(clampedStart + slotCount - 1)}:00.000Z`,
      };
    }));
  }, []);

  /** Aktualizuje detail kurtu (povrch, indoor, cena, …) */
  const updateCourt = useCallback((courtId: string, updates: Partial<CourtWithClub>) => {
    setCourts(prev => prev.map(c => c.id === courtId ? { ...c, ...updates } : c));
  }, []);

  /** Aktualizuje nastavení klubu (v sezónním režimu synchronizuje preset aktivní sezóny) */
  const updateSettings = useCallback((updates: Partial<ClubSettings>) => {
    const current = getClubSettingsSnapshot();
    patchClubSettings(applySettingsPatch(current, updates));
  }, []);

  /** Rezervace pro konkrétní datum (bez zrušených) */
  const getBookingsForDate = useCallback((date: string): ClubBooking[] => {
    return bookings.filter(b => b.date === date && b.status !== 'cancelled');
  }, [bookings]);

  /** Obecná aktualizace rezervace (platba, zrušení, …) */
  const updateBooking = useCallback((id: string, updates: Partial<ClubBooking>) => {
    setBookings(prev => prev.map(b => {
      if (b.id !== id) return b;
      const next = { ...b, ...updates };
      if ('note' in updates && !updates.note) delete next.note;
      return next;
    }));
  }, []);

  /** Přesune rezervaci na jiný den (jen dnes nebo budoucí, do maxBookingDaysAhead) */
  const changeBookingDate = useCallback((
    bookingId: string,
    newDate: string,
  ): { ok: true; booking: ClubBooking } | { ok: false; error: string } => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return { ok: false, error: 'Rezervace nenalezena' };

    const todayKey = localDateKey();
    if (newDate < todayKey) {
      return { ok: false, error: 'Datum nemůže být v minulosti' };
    }

    const maxD = new Date();
    maxD.setHours(12, 0, 0, 0);
    maxD.setDate(maxD.getDate() + settings.maxBookingDaysAhead);
    const maxKey = localDateKey(maxD);
    if (newDate > maxKey) {
      return { ok: false, error: `Maximálně ${settings.maxBookingDaysAhead} dní dopředu` };
    }

    if (newDate === booking.date) {
      return { ok: true, booking };
    }

    const conflict = bookings.some(b =>
      b.id !== bookingId
      && b.date === newDate
      && b.status !== 'cancelled'
      && b.court_id === booking.court_id
      && booking.slots.some(s => b.slots.includes(s))
    );
    if (conflict) {
      return { ok: false, error: 'V zvolený den je kurt v tomto čase obsazený' };
    }

    const slotMin = Math.min(...booking.slots);
    const slotMax = Math.max(...booking.slots);
    const updated: ClubBooking = {
      ...booking,
      date: newDate,
      starts_at: `${newDate}T${slotToTime(slotMin)}:00.000Z`,
      ends_at:   `${newDate}T${slotEndTime(slotMax)}:00.000Z`,
    };

    setBookings(prev => prev.map(b => b.id === bookingId ? updated : b));
    return { ok: true, booking: updated };
  }, [bookings, settings.maxBookingDaysAhead]);

  /** Změní délku rezervace (stejný začátek, po sobě jdoucí sloty) */
  const changeBookingDuration = useCallback((
    bookingId: string,
    durationMinutes: number,
  ): { ok: true; booking: ClubBooking } | { ok: false; error: string } => {
    if (durationMinutes % 30 !== 0 || durationMinutes < 30) {
      return { ok: false, error: 'Neplatná délka rezervace' };
    }

    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return { ok: false, error: 'Rezervace nenalezena' };

    const slotMin = Math.min(...booking.slots);
    const count   = durationMinutes / 30;
    const newSlots = Array.from({ length: count }, (_, i) => slotMin + i);

    if (Math.max(...newSlots) > getEffectiveClosingSlot(booking.date, settings)) {
      return { ok: false, error: 'Délka přesahuje provozní dobu' };
    }

    const conflict = bookings.some(b =>
      b.id !== bookingId
      && b.date === booking.date
      && b.status !== 'cancelled'
      && b.court_id === booking.court_id
      && newSlots.some(s => b.slots.includes(s))
    );
    if (conflict) {
      return { ok: false, error: 'Prodloužení koliduje s jinou rezervací' };
    }

    const court = courts.find(c => c.id === booking.court_id);
    const pricePerHour = court?.price_per_hour ?? 0;
    const slotMax = Math.max(...newSlots);
    const updated: ClubBooking = {
      ...booking,
      slots: newSlots,
      price: Math.round(calculateSlotsPrice(
        booking.court_id, booking.date, newSlots, pricePerHour, settings,
      )),
      starts_at: `${booking.date}T${slotToTime(slotMin)}:00.000Z`,
      ends_at:   `${booking.date}T${slotEndTime(slotMax)}:00.000Z`,
    };

    setBookings(prev => prev.map(b => b.id === bookingId ? updated : b));
    return { ok: true, booking: updated };
  }, [bookings, courts, settings]);

  /** Vytvoří novou rezervaci (správce klubu) */
  const createBooking = useCallback((params: {
    courtId: string;
    playerName: string;
    date: string;
    slots: number[];
    price: number;
    paymentStatus: PaymentStatus;
    note?: string;
  }): ClubBooking | null => {
    const slotMin = Math.min(...params.slots);
    const slotMax = Math.max(...params.slots);
    const conflict = bookings.some(b =>
      b.date === params.date
      && b.status !== 'cancelled'
      && b.court_id === params.courtId
      && params.slots.some(s => b.slots.includes(s))
    );
    if (conflict) return null;

    const newBooking: ClubBooking = {
      id:              `cb_${Date.now()}`,
      court_id:        params.courtId,
      player_name:     params.playerName.trim(),
      date:            params.date,
      starts_at:       `${params.date}T${slotToTime(slotMin)}:00.000Z`,
      ends_at:         `${params.date}T${slotEndTime(slotMax)}:00.000Z`,
      slots:           [...params.slots].sort((a, b) => a - b),
      price:           params.price,
      payment_status:  params.paymentStatus,
      status:          'confirmed',
      ...(params.note?.trim() ? { note: params.note.trim() } : {}),
    };
    setBookings(prev => [...prev, newBooking]);
    return newBooking;
  }, [bookings]);

  /** Ověří, zda hráč smí editovat (slot je dál než editLockHours) */
  const canPlayerEdit = useCallback((booking: ClubBooking): boolean => {
    const startsMs  = new Date(booking.starts_at).getTime();
    const nowMs     = Date.now();
    const diffHours = (startsMs - nowMs) / 3_600_000;
    return diffHours > settings.editLockHours;
  }, [settings.editLockHours]);

  return {
    bookings, settings, courts,
    moveBooking, updateBooking, createBooking, changeBookingDate, changeBookingDuration, updateCourt, updateSettings,
    getBookingsForDate, canPlayerEdit,
  };
}
