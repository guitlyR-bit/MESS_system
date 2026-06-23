import { useState, useCallback } from 'react';
import type { BookingWithCourt } from '@/types/database';
import {
  MOCK_MY_BOOKINGS,
  MOCK_BOOKED_SLOTS,
  SLOT_START_HOUR,
} from '@/lib/mockData';

type BookedSlots = Record<string, Record<string, number[]>>;

function toTimeStr(slotIndex: number): string {
  const totalMin = SLOT_START_HOUR * 60 + slotIndex * 30;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function useBookings() {
  const [bookings,    setBookings]    = useState<BookingWithCourt[]>(MOCK_MY_BOOKINGS);
  const [bookedSlots, setBookedSlots] = useState<BookedSlots>(MOCK_BOOKED_SLOTS);

  // ── Vytvoření rezervace ──────────────────────────────────────────────────────

  const createBooking = useCallback((params: {
    courtId: string;
    courtName: string;
    courtSport: string;
    clubName: string;
    clubCity: string;
    date: string;
    slots: number[];
    price: number;
  }): BookingWithCourt => {
    const firstSlot = Math.min(...params.slots);
    const lastSlot  = Math.max(...params.slots);
    const startTime = toTimeStr(firstSlot);
    const endTime   = toTimeStr(lastSlot + 1);
    const id        = `b_${Date.now()}`;

    const newBooking: BookingWithCourt = {
      id,
      court_id:    params.courtId,
      court_name:  params.courtName,
      court_sport: params.courtSport as any,
      club_name:   params.clubName,
      club_city:   params.clubCity,
      player_id:   'player1',
      starts_at:   `${params.date}T${startTime}:00.000Z`,
      ends_at:     `${params.date}T${endTime}:00.000Z`,
      status:      'confirmed',
      price:       params.price,
      slots:       params.slots,
      created_at:  new Date().toISOString(),
    };

    setBookings(prev => [newBooking, ...prev]);
    setBookedSlots(prev => addSlots(prev, params.courtId, params.date, params.slots));

    return newBooking;
  }, []);

  // ── Editace rezervace ────────────────────────────────────────────────────────

  const editBooking = useCallback((
    bookingId: string,
    params: {
      courtId?: string;
      courtName?: string;
      courtSport?: string;
      clubName?: string;
      clubCity?: string;
      date: string;
      slots: number[];
      price: number;
    }
  ) => {
    setBookings(prev => {
      const original = prev.find(b => b.id === bookingId);
      if (!original) return prev;

      const firstSlot = Math.min(...params.slots);
      const lastSlot  = Math.max(...params.slots);
      const startTime = toTimeStr(firstSlot);
      const endTime   = toTimeStr(lastSlot + 1);

      return prev.map(b => {
        if (b.id !== bookingId) return b;
        return {
          ...b,
          court_id:    params.courtId    ?? b.court_id,
          court_name:  params.courtName  ?? b.court_name,
          court_sport: (params.courtSport ?? b.court_sport) as any,
          club_name:   params.clubName   ?? b.club_name,
          club_city:   params.clubCity   ?? b.club_city,
          starts_at:   `${params.date}T${startTime}:00.000Z`,
          ends_at:     `${params.date}T${endTime}:00.000Z`,
          price:       params.price,
          slots:       params.slots,
        };
      });
    });

    // Aktualizuje bookedSlots — odstraní staré, přidá nové
    setBookings(current => {
      const original = current.find(b => b.id === bookingId);
      if (!original) return current;

      const oldCourtId = original.court_id;
      const oldDate    = original.starts_at.slice(0, 10);
      const oldSlots   = original.slots ?? [];
      const newCourtId = params.courtId ?? oldCourtId;

      setBookedSlots(prev => {
        let updated = removeSlots(prev, oldCourtId, oldDate, oldSlots);
        updated     = addSlots(updated, newCourtId, params.date, params.slots);
        return updated;
      });

      return current;
    });
  }, []);

  // ── Zrušení rezervace ────────────────────────────────────────────────────────

  const cancelBooking = useCallback((bookingId: string) => {
    setBookings(prev =>
      prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' as const } : b)
    );
  }, []);

  // ── Dotazy na sloty ──────────────────────────────────────────────────────────

  /** Obsazené sloty pro daný kurt a datum */
  const getBookedSlots = useCallback((courtId: string, date: string): number[] => {
    return bookedSlots[courtId]?.[date] ?? [];
  }, [bookedSlots]);

  /**
   * Obsazené sloty pro daný kurt a datum, ale BEZ slotů patřících
   * zadané rezervaci — umožňuje zobrazit "vlastní" sloty jako volné při editaci.
   */
  const getBookedSlotsExcluding = useCallback((
    courtId: string, date: string, excludeBookingId: string
  ): number[] => {
    const all      = bookedSlots[courtId]?.[date] ?? [];
    const booking  = bookings.find(b => b.id === excludeBookingId);
    if (!booking || booking.court_id !== courtId) return all;
    const bookDate = booking.starts_at.slice(0, 10);
    if (bookDate !== date) return all;
    const ownSlots = booking.slots ?? [];
    return all.filter(s => !ownSlots.includes(s));
  }, [bookedSlots, bookings]);

  // ── Odvozené hodnoty ─────────────────────────────────────────────────────────

  const upcomingBookings = bookings
    .filter(b => b.status === 'confirmed' && new Date(b.starts_at) >= new Date())
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const activeBookings = bookings.filter(b => b.status !== 'cancelled');

  return {
    bookings,
    upcomingBookings,
    activeBookings,
    createBooking,
    editBooking,
    cancelBooking,
    getBookedSlots,
    getBookedSlotsExcluding,
  };
}

// ── Helpers pro bookedSlots ──────────────────────────────────────────────────

function addSlots(
  prev: BookedSlots, courtId: string, date: string, slots: number[]
): BookedSlots {
  return {
    ...prev,
    [courtId]: {
      ...prev[courtId],
      [date]: [...(prev[courtId]?.[date] ?? []), ...slots],
    },
  };
}

function removeSlots(
  prev: BookedSlots, courtId: string, date: string, slots: number[]
): BookedSlots {
  const existing = prev[courtId]?.[date] ?? [];
  return {
    ...prev,
    [courtId]: {
      ...prev[courtId],
      [date]: existing.filter(s => !slots.includes(s)),
    },
  };
}
