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

  /** Vytvoří novou rezervaci — vrátí vytvořenou rezervaci nebo null při chybě */
  const createBooking = useCallback((params: {
    courtId: string;
    courtName: string;
    courtSport: string;
    clubName: string;
    clubCity: string;
    date: string;      // 'YYYY-MM-DD'
    hour: number;      // 7–21
    price: number;
  }): BookingWithCourt => {
    const id = `b_${Date.now()}`;
    const newBooking: BookingWithCourt = {
      id,
      court_id:    params.courtId,
      court_name:  params.courtName,
      court_sport: params.courtSport as any,
      club_name:   params.clubName,
      club_city:   params.clubCity,
      player_id:   'player1',
      starts_at:   `${params.date}T${String(params.hour).padStart(2, '0')}:00:00.000Z`,
      ends_at:     `${params.date}T${String(params.hour + 1).padStart(2, '0')}:00:00.000Z`,
      status:      'confirmed',
      price:       params.price,
      created_at:  new Date().toISOString(),
    };

    setBookings(prev => [newBooking, ...prev]);

    // Označí slot jako obsazený
    setBookedSlots(prev => ({
      ...prev,
      [params.courtId]: {
        ...prev[params.courtId],
        [params.date]: [
          ...(prev[params.courtId]?.[params.date] ?? []),
          params.hour,
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

  /** Vrátí obsazené hodiny pro daný kurt a datum */
  const getBookedHours = useCallback((courtId: string, date: string): number[] => {
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
    getBookedHours,
  };
}
