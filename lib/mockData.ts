/**
 * Mock data pro rezervační systém
 * Nahrazuje volání Supabase — bude vyměněno za reálné API
 */

import type { CourtWithClub, BookingWithCourt, SportType, ClubBooking, ClubSettings, PaymentStatus } from '@/types/database';

// ─── Sportoviště (venues / kluby) ─────────────────────────────────────────────

export interface Venue {
  id: string;
  name: string;
  city: string;
  address: string;
  sports: SportType[];
  courtCount: number;
  priceFrom: number;
  priceTo: number;
  availableToday: number;
}

export const MOCK_VENUES: Venue[] = [
  {
    id: 'club1',
    name: 'TK Sparta Praha',
    city: 'Praha 7',
    address: 'Milady Horákové 98',
    sports: ['tennis'],
    courtCount: 2,
    priceFrom: 250,
    priceTo: 250,
    availableToday: 8,
  },
  {
    id: 'club2',
    name: 'Badminton Centrum Praha',
    city: 'Praha 4',
    address: 'Pankrácké náměstí 3',
    sports: ['badminton'],
    courtCount: 2,
    priceFrom: 180,
    priceTo: 180,
    availableToday: 9,
  },
  {
    id: 'club3',
    name: 'Squash Aréna Vinohrady',
    city: 'Praha 2',
    address: 'Mánesova 8',
    sports: ['squash'],
    courtCount: 1,
    priceFrom: 200,
    priceTo: 200,
    availableToday: 4,
  },
  {
    id: 'club4',
    name: 'Padel Club Brno',
    city: 'Brno',
    address: 'Veveří 45',
    sports: ['padel'],
    courtCount: 1,
    priceFrom: 300,
    priceTo: 300,
    availableToday: 6,
  },
];

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
    slots: [6, 7],   // 10:00–11:00
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
    slots: [20, 21],  // 17:00–18:00
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

// ─── Club admin mock data ─────────────────────────────────────────────────────

function mkCB(
  id: string, courtId: string, playerName: string,
  dayOffset: number, slots: number[],
  pricePerHour: number, paymentStatus: PaymentStatus
): ClubBooking {
  const date    = todayStr(dayOffset);
  const slotMin = Math.min(...slots);
  const slotMax = Math.max(...slots);
  return {
    id, court_id: courtId, player_name: playerName, date,
    starts_at: `${date}T${slotToTime(slotMin)}:00.000Z`,
    ends_at:   `${date}T${slotEndTime(slotMax)}:00.000Z`,
    slots, price: slotPrice(slots.length, pricePerHour),
    payment_status: paymentStatus, status: 'confirmed',
  };
}

export const MOCK_CLUB_BOOKINGS: ClubBooking[] = [
  // Dnes — Dvorec 1 (c1)
  mkCB('cb1',  'c1', 'Jan Novák',           0, [4,5,6],          250, 'paid'),
  mkCB('cb2',  'c1', 'Petra Marková',        0, [14,15,16,17],    250, 'pay_on_site'),
  // Dnes — Dvorec 2 (c2)
  mkCB('cb3',  'c2', 'Pavel Horák',          0, [2,3],            250, 'paid'),
  mkCB('cb4',  'c2', 'Jana Svobodová',       0, [12,13],          250, 'pending'),
  mkCB('cb5',  'c2', 'Martin Kolář',         0, [24,25],          250, 'pay_on_site'),
  // Dnes — Hala A – kurt 1 (c3)
  mkCB('cb6',  'c3', 'Kateřina Nová',        0, [6,7,8,9],        180, 'paid'),
  mkCB('cb7',  'c3', 'Tomáš Veselý',         0, [22,23,24,25,26], 180, 'pay_on_site'),
  // Dnes — Hala A – kurt 2 (c4)
  mkCB('cb8',  'c4', 'Eva Procházková',      0, [4,5,6],          180, 'pending'),
  mkCB('cb9',  'c4', 'Radek Blažek',         0, [16,17,18,19],    180, 'paid'),
  // Dnes — Squash Kurt 1 (c5)
  mkCB('cb10', 'c5', 'Lukáš Beneš',          0, [2,3,10,11],      200, 'paid'),
  // Dnes — Padel kurt 1 (c6)
  mkCB('cb11', 'c6', 'Alžběta Dvořáčková',  0, [4,5,6,7,8,9],    300, 'paid'),
  mkCB('cb12', 'c6', 'Roman Vítek',          0, [20,21,22,23],    300, 'pay_on_site'),
  // Zítra — Dvorec 1
  mkCB('cb13', 'c1', 'Jan Novák',            1, [2,3],            250, 'pending'),
  mkCB('cb14', 'c1', 'Ondřej Vítek',         1, [10,11,12,13],    250, 'pay_on_site'),
  // Zítra — Dvorec 2
  mkCB('cb15', 'c2', 'Marie Horáčková',      1, [6,7,8,9,10,11],  250, 'paid'),
  // Zítra — Hala c3
  mkCB('cb16', 'c3', 'Roman Blažek',         1, [4,5,6],          180, 'pending'),
  mkCB('cb17', 'c3', 'Tereza Nováková',      1, [14,15,16,17,18,19], 180, 'pay_on_site'),
];

export const MOCK_CLUB_SETTINGS: ClubSettings = {
  editLockHours: 24,   // hráč nemůže editovat méně než 24h před rezervací
  openingSlot:   0,    // 7:00
  closingSlot:   29,   // 21:30
};
