import { useState, useCallback } from 'react';
import type { ClubBooking, ClubSettings, CourtWithClub, PaymentStatus } from '@/types/database';
import {
  MOCK_CLUB_BOOKINGS,
  MOCK_CLUB_SETTINGS,
  MOCK_COURTS,
  slotToTime,
  slotEndTime,
  SLOT_COUNT,
} from '@/lib/mockData';

export function useClubBookings() {
  const [bookings, setBookings]   = useState<ClubBooking[]>(MOCK_CLUB_BOOKINGS);
  const [settings, setSettings]   = useState<ClubSettings>(MOCK_CLUB_SETTINGS);
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

  /** Aktualizuje nastavení klubu */
  const updateSettings = useCallback((updates: Partial<ClubSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  /** Rezervace pro konkrétní datum (bez zrušených) */
  const getBookingsForDate = useCallback((date: string): ClubBooking[] => {
    return bookings.filter(b => b.date === date && b.status !== 'cancelled');
  }, [bookings]);

  /** Obecná aktualizace rezervace (platba, zrušení, …) */
  const updateBooking = useCallback((id: string, updates: Partial<ClubBooking>) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  }, []);

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
    moveBooking, updateBooking, createBooking, updateCourt, updateSettings,
    getBookingsForDate, canPlayerEdit,
  };
}
