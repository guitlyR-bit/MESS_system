/**
 * Mock data pro rezervační systém
 * Nahrazuje volání Supabase — bude vyměněno za reálné API
 */

import type { CourtWithClub, BookingWithCourt } from '@/types/database';

// ─── Sportoviště ──────────────────────────────────────────────────────────────

export const MOCK_COURTS: CourtWithClub[] = [
  {
    id: 'c1',
    club_id: 'club1',
    club_name: 'TK Sparta Praha',
    club_city: 'Praha 7',
    name: 'Dvorec 1',
    sport: 'tennis',
    surface: 'clay',
    is_indoor: false,
    is_active: true,
    price_per_hour: 250,
    capacity: 4,
    available_today: 5,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'c2',
    club_id: 'club1',
    club_name: 'TK Sparta Praha',
    club_city: 'Praha 7',
    name: 'Dvorec 2',
    sport: 'tennis',
    surface: 'clay',
    is_indoor: false,
    is_active: true,
    price_per_hour: 250,
    capacity: 4,
    available_today: 3,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'c3',
    club_id: 'club2',
    club_name: 'Badminton Centrum Praha',
    club_city: 'Praha 4',
    name: 'Hala A – kurt 1',
    sport: 'badminton',
    surface: 'indoor',
    is_indoor: true,
    is_active: true,
    price_per_hour: 180,
    capacity: 4,
    available_today: 7,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'c4',
    club_id: 'club2',
    club_name: 'Badminton Centrum Praha',
    club_city: 'Praha 4',
    name: 'Hala A – kurt 2',
    sport: 'badminton',
    surface: 'indoor',
    is_indoor: true,
    is_active: true,
    price_per_hour: 180,
    capacity: 4,
    available_today: 2,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'c5',
    club_id: 'club3',
    club_name: 'Squash Aréna Vinohrady',
    club_city: 'Praha 2',
    name: 'Kurt 1',
    sport: 'squash',
    surface: 'indoor',
    is_indoor: true,
    is_active: true,
    price_per_hour: 200,
    capacity: 2,
    available_today: 4,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'c6',
    club_id: 'club4',
    club_name: 'Padel Club Brno',
    club_city: 'Brno',
    name: 'Padel kurt 1',
    sport: 'padel',
    surface: 'carpet',
    is_indoor: false,
    is_active: true,
    price_per_hour: 300,
    capacity: 4,
    available_today: 6,
    created_at: '2024-01-01T00:00:00Z',
  },
];

// ─── Sloty — 30minutové bloky ─────────────────────────────────────────────────
//
//  Index 0 = 7:00, 1 = 7:30, 2 = 8:00 … 29 = 21:30
//  Celkem 30 slotů za den (7:00 – 22:00)

export const SLOT_COUNT      = 30;
export const SLOT_START_HOUR = 7;
export const ALL_SLOTS: number[] = Array.from({ length: SLOT_COUNT }, (_, i) => i);

/** Slot index → zobrazitelný čas ('07:00', '07:30', …) */
export function slotToTime(index: number): string {
  const totalMin = SLOT_START_HOUR * 60 + index * 30;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Konec výběru — čas za posledním slotem (= start dalšího bloku) */
export function slotEndTime(lastIndex: number): string {
  return slotToTime(lastIndex + 1);
}

/** Počet slotů → trvání jako string ('30 min', '1 hod', '1,5 hod', …) */
export function slotDuration(count: number): string {
  const minutes = count * 30;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hod` : `${h},5 hod`;
}

/** Cena za vybraný počet slotů */
export function slotPrice(count: number, pricePerHour: number): number {
  return Math.round((count * 0.5) * pricePerHour);
}

// ─── Obsazené sloty (courtId → datum → pole indexů slotů) ────────────────────

type BookedSlots = Record<string, Record<string, number[]>>;

export const MOCK_BOOKED_SLOTS: BookedSlots = {
  c1: {
    [todayStr(0)]: [4, 5, 6, 14, 15, 16, 17],    // 9:00–10:30, 14:00–15:30
    [todayStr(1)]: [2, 3, 10, 11, 22, 23],
    [todayStr(2)]: [6, 7, 8, 18, 19],
  },
  c2: {
    [todayStr(0)]: [2, 3, 12, 13, 24, 25],
    [todayStr(1)]: [4, 5, 20, 21],
  },
  c3: {
    [todayStr(0)]: [0, 1, 2, 3, 4, 5, 22, 23, 24, 25, 26], // ráno a večer obsazeno
    [todayStr(1)]: [6, 7, 8],
  },
  c5: {
    [todayStr(0)]: [2, 3, 10, 11, 26, 27],
  },
};

// ─── Existující rezervace hráče ───────────────────────────────────────────────

export const MOCK_MY_BOOKINGS: BookingWithCourt[] = [
  {
    id: 'b1',
    court_id: 'c1',
    court_name: 'Dvorec 1',
    court_sport: 'tennis',
    club_name: 'TK Sparta Praha',
    club_city: 'Praha 7',
    player_id: 'player1',
    starts_at: todayISO(1, 10),
    ends_at:   todayISO(1, 11),
    status: 'confirmed',
    price: 250,
    created_at: new Date().toISOString(),
  },
  {
    id: 'b2',
    court_id: 'c3',
    court_name: 'Hala A – kurt 1',
    court_sport: 'badminton',
    club_name: 'Badminton Centrum Praha',
    club_city: 'Praha 4',
    player_id: 'player1',
    starts_at: todayISO(3, 17),
    ends_at:   todayISO(3, 18),
    status: 'confirmed',
    price: 180,
    created_at: new Date().toISOString(),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Vrátí datum za +daysOffset dní jako 'YYYY-MM-DD' */
export function todayStr(daysOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().slice(0, 10);
}

/** Vrátí ISO string pro daný den a hodinu */
export function todayISO(daysOffset: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

/** Vrátí array 14 dnů od dnes */
export function getNext14Days(): Date[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
}

/** @deprecated Použij slotToTime() */
export function fmtHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

/** Formátuje datum jako 'ČT 26.6.' */
export function fmtDay(d: Date): { short: string; num: string; month: string } {
  const days = ['NE', 'PO', 'ÚT', 'ST', 'ČT', 'PÁ', 'SO'];
  return {
    short: days[d.getDay()],
    num:   String(d.getDate()),
    month: String(d.getMonth() + 1) + '.',
  };
}

/** Popis sportu česky */
export const SPORT_LABELS: Record<string, string> = {
  tennis:     'Tenis',
  badminton:  'Badminton',
  squash:     'Squash',
  padel:      'Padel',
  volleyball: 'Volejbal',
  basketball: 'Basketbal',
  football:   'Fotbal',
};

/** Popis povrchu česky */
export const SURFACE_LABELS: Record<string, string> = {
  clay:    'Antuka',
  hard:    'Tvrdý',
  grass:   'Tráva',
  carpet:  'Koberec',
  indoor:  'Hala',
};
