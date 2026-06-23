import { useState, useCallback } from 'react';
import type { BookingWithCourt } from '@/types/database';
import {
  MOCK_MY_BOOKINGS,
  MOCK_BOOKED_SLOTS,
  todayStr,
  todayISO,
} from '@/lib/mockData';

export function useBookings() {
  const [bookings, setBookings] = useState<BookingWithCourt[]>(MOCK_MY_BOOKINGS);
  const [bookedSlots, setBookedSlots] = useState(MOCK_BOOKED_SLOTS);

  /** Vytvoří novou rezervaci ze seznamu slotů */
  const createBooking = useCallback((params: {
    courtId: string;
    courtName: string;
    courtSport: string;
    clubName: string;
    clubCity: string;
    date: string;         // 'YYYY-MM-DD'
    slots: number[];      // indexy vybraných slotů (0–29)
    price: number;        // celková cena
  }): BookingWithCourt => {
    const SLOT_START = 7; // 7:00
    const firstSlot = Math.min(...params.slots);
    const lastSlot  = Math.max(...params.slots);

    const toTime = (idx: number) => {
      const totalMin = SLOT_START * 60 + idx * 30;
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const startTime = toTime(firstSlot);
    const endTime   = toTime(lastSlot + 1); // konec posledního bloku

    const id = `b_${Date.now()}`;
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
      created_at:  new Date().toISOString(),
    };

    setBookings(prev => [newBooking, ...prev]);

    // Označí všechny vybrané sloty jako obsazené
    setBookedSlots(prev => ({
      ...prev,
      [params.courtId]: {
        ...prev[params.courtId],
        [params.date]: [
          ...(prev[params.courtId]?.[params.date] ?? []),
          ...params.slots,
        ],
      },
    }));

    return newBooking;
  }, []);

  /** Zruší rezervaci podle ID */
  const cancelBooking = useCallback((bookingId: string) => {
    setBookings(prev =>
      prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' as const } : b)
    );
  }, []);

  /** Vrátí obsazené sloty (indexy 0–29) pro daný kurt a datum */
  const getBookedSlots = useCallback((courtId: string, date: string): number[] => {
    return bookedSlots[courtId]?.[date] ?? [];
  }, [bookedSlots]);

  /** Nadcházející aktivní rezervace (seřazené od nejbližší) */
  const upcomingBookings = bookings
    .filter(b => b.status === 'confirmed' && new Date(b.starts_at) >= new Date())
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  /** Všechny aktivní rezervace */
  const activeBookings = bookings.filter(b => b.status !== 'cancelled');

  return {
    bookings,
    upcomingBookings,
    activeBookings,
    createBooking,
    cancelBooking,
    getBookedSlots,
  };
}
