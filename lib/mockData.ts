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
//  Index 0 = 0:00, 1 = 0:30, … 14 = 7:00, … 47 = 23:30
//  Celkem 48 slotů za den (0:00 – 24:00), provozní doba nastavitelná přes ClubSettings

export const SLOT_COUNT      = 48;
export const SLOT_START_HOUR = 0;
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
    [todayStr(0)]: [18, 19, 20, 28, 29, 30, 31],    // 9:00–10:30, 14:00–15:30
    [todayStr(1)]: [16, 17, 24, 25, 36, 37],
    [todayStr(2)]: [20, 21, 22, 32, 33],
  },
  c2: {
    [todayStr(0)]: [16, 17, 26, 27, 38, 39],
    [todayStr(1)]: [18, 19, 34, 35],
  },
  c3: {
    [todayStr(0)]: [14, 15, 16, 17, 18, 19, 36, 37, 38, 39, 40], // ráno a večer obsazeno
    [todayStr(1)]: [20, 21, 22],
  },
  c5: {
    [todayStr(0)]: [16, 17, 24, 25, 40, 41],
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
    slots: [20, 21],  // 10:00–11:00
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
    slots: [34, 35],  // 17:00–18:00
    created_at: new Date().toISOString(),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Lokální kalendářní datum jako 'YYYY-MM-DD' (bez UTC posunu) */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Vrátí datum za +daysOffset dní jako 'YYYY-MM-DD' */
export function todayStr(daysOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return localDateKey(d);
}

/** Vrátí ISO string pro daný den a hodinu */
export function todayISO(daysOffset: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

/** Vrátí array dnů od dnes do +maxDaysAhead (včetně) */
export function getBookableDays(maxDaysAhead: number): Date[] {
  return Array.from({ length: maxDaysAhead + 1 }, (_, i) => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });
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

// ─── Registrovaní hráči (pro výběr správcem klubu) ───────────────────────────

export interface RegisteredPlayer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export function registeredPlayerFullName(p: RegisteredPlayer): string {
  return `${p.first_name} ${p.last_name}`;
}

export const MOCK_REGISTERED_PLAYERS: RegisteredPlayer[] = [
  { id: 'rp1', first_name: 'Jan',       last_name: 'Novák',        email: 'jan.novak@gmail.com' },
  { id: 'rp2', first_name: 'Petra',     last_name: 'Marková',      email: 'petra.markova@seznam.cz' },
  { id: 'rp3', first_name: 'Pavel',     last_name: 'Horák',        email: 'pavel.horak@email.cz' },
  { id: 'rp4', first_name: 'Jana',      last_name: 'Svobodová',    email: 'jana.svobodova@gmail.com' },
  { id: 'rp5', first_name: 'Martin',    last_name: 'Kolář',        email: 'martin.kolar@centrum.cz' },
  { id: 'rp6', first_name: 'Kateřina',  last_name: 'Nová',         email: 'katerina.nova@email.cz' },
  { id: 'rp7', first_name: 'Tomáš',     last_name: 'Veselý',       email: 'tomas.vesely@volny.cz' },
  { id: 'rp8', first_name: 'Eva',       last_name: 'Procházková',  email: 'eva.prochazkova@gmail.com' },
];

// ─── Club admin mock data ─────────────────────────────────────────────────────

function mkCB(
  id: string, courtId: string, playerName: string,
  dayOffset: number, slots: number[],
  pricePerHour: number, paymentStatus: PaymentStatus,
  note?: string
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
    ...(note ? { note } : {}),
  };
}

export function createMockClubBookings(): ClubBooking[] {
  return [
  // Dnes — Dvorec 1 (c1)
  mkCB('cb1',  'c1', 'Jan Novák',           0, [18,19,20],           250, 'paid',        'Prosím dvorec u branky, přijíždím na kole.'),
  mkCB('cb2',  'c1', 'Petra Marková',        0, [28,29,30,31],        250, 'pay_on_site'),
  // Dnes — Dvorec 2 (c2)
  mkCB('cb3',  'c2', 'Pavel Horák',          0, [16,17],              250, 'paid'),
  mkCB('cb4',  'c2', 'Jana Svobodová',       0, [26,27],              250, 'pending',     'Potřebuji půjčit raketu – hraju levou rukou.'),
  mkCB('cb5',  'c2', 'Martin Kolář',         0, [38,39],              250, 'pay_on_site'),
  // Dnes — Hala A – kurt 1 (c3)
  mkCB('cb6',  'c3', 'Kateřina Nová',        0, [20,21,22,23],        180, 'paid'),
  mkCB('cb7',  'c3', 'Tomáš Veselý',         0, [36,37,38,39,40],     180, 'pay_on_site', 'Skupinová lekce, přijde 6 lidí. Prosím připravit 3 páry míčů.'),
  // Dnes — Hala A – kurt 2 (c4)
  mkCB('cb8',  'c4', 'Eva Procházková',      0, [18,19,20],           180, 'pending'),
  mkCB('cb9',  'c4', 'Radek Blažek',         0, [30,31,32,33],        180, 'paid'),
  // Dnes — Squash Kurt 1 (c5)
  mkCB('cb10', 'c5', 'Lukáš Beneš',          0, [16,17,24,25],        200, 'paid'),
  // Dnes — Padel kurt 1 (c6)
  mkCB('cb11', 'c6', 'Alžběta Dvořáčková',  0, [18,19,20,21,22,23],  300, 'paid'),
  mkCB('cb12', 'c6', 'Roman Vítek',          0, [34,35,36,37],        300, 'pay_on_site'),
  // Zítra — Dvorec 1
  mkCB('cb13', 'c1', 'Jan Novák',            1, [16,17],              250, 'pending'),
  mkCB('cb14', 'c1', 'Ondřej Vítek',         1, [24,25,26,27],        250, 'pay_on_site', 'Turnaj juniorů – prosím připravit síťky a značky.'),
  // Zítra — Dvorec 2
  mkCB('cb15', 'c2', 'Marie Horáčková',      1, [20,21,22,23,24,25],  250, 'paid'),
  // Zítra — Hala c3
  mkCB('cb16', 'c3', 'Roman Blažek',         1, [18,19,20],           180, 'pending'),
  mkCB('cb17', 'c3', 'Tereza Nováková',      1, [28,29,30,31,32,33],  180, 'pay_on_site'),
  ];
}

/** Mock rezervace — při importu modulu; pro runtime použij createMockClubBookings() */
export const MOCK_CLUB_BOOKINGS: ClubBooking[] = createMockClubBookings();

export const MOCK_CLUB_SETTINGS: ClubSettings = {
  editLockHours:        24,   // hráč nemůže editovat méně než 24h před rezervací
  openingSlot:          14,   // 7:00 (slot 14 při SLOT_START_HOUR=0)
  closingSlot:          43,   // 21:30 (slot 43 při SLOT_START_HOUR=0); max 47 = 24:00
  maxBookingDaysAhead:  14,   // hráč může rezervovat max 14 dní dopředu
};
