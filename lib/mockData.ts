/**
 * Mock data pro rezervační systém
 * Nahrazuje volání Supabase — bude vyměněno za reálné API
 */

import type { Club, CourtWithClub, BookingWithCourt, SportType, ClubBooking, ClubSettings, PaymentStatus, CourtCategory, Season } from '@/types/database';

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
    name: 'TK Meteor Praha',
    city: 'Praha 10',
    address: 'U Meteoru 6',
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

// ─── Sezóny klubu ─────────────────────────────────────────────────────────────

export const MOCK_SEASONS: Season[] = [
  {
    id: 'season_summer_2026',
    name: 'Letní sezóna 2026',
    start_date: '2026-04-01',
    end_date: '2026-09-30',
  },
  {
    id: 'season_winter_2025_26',
    name: 'Zimní sezóna 2025/26',
    start_date: '2025-10-01',
    end_date: '2026-03-31',
  },
  {
    id: 'season_summer_2025',
    name: 'Letní sezóna 2025',
    start_date: '2025-04-01',
    end_date: '2025-09-30',
    is_closed: true,
  },
];

// ─── Barvy kategorií kurtů ────────────────────────────────────────────────────

export const CATEGORY_COLORS = [
  { id: 'orange', hex: '#F97316', label: 'Oranžová' },
  { id: 'blue',   hex: '#3B82F6', label: 'Modrá' },
  { id: 'green',  hex: '#22C55E', label: 'Zelená' },
  { id: 'purple', hex: '#8B5CF6', label: 'Fialová' },
  { id: 'red',    hex: '#EF4444', label: 'Červená' },
  { id: 'teal',   hex: '#14B8A6', label: 'Tyrkysová' },
  { id: 'yellow', hex: '#EAB308', label: 'Žlutá' },
  { id: 'pink',   hex: '#EC4899', label: 'Růžová' },
] as const;

export type CategoryColorId = typeof CATEGORY_COLORS[number]['id'];

// ─── Kategorie kurtů ──────────────────────────────────────────────────────────

export const MOCK_COURT_CATEGORIES: CourtCategory[] = [
  {
    id: 'cat_sparta_outdoor',
    name: 'Venkovní kurty',
    court_ids: ['c1', 'c2'],
    color: '#F97316',
    season_id: 'season_summer_2026',
  },
  {
    id: 'cat_badminton_hall',
    name: 'Halové kurty',
    court_ids: ['c3', 'c4'],
    color: '#3B82F6',
    season_id: 'season_winter_2025_26',
  },
  {
    id: 'cat_squash',
    name: 'Squash',
    court_ids: ['c5'],
    color: '#22C55E',
    season_id: 'season_summer_2026',
  },
];

/** Profil spravovaného klubu (záložka Profil) */
export const MOCK_CLUB_PROFILE: Club = {
  id: 'club1',
  name: 'TK Meteor Praha',
  slug: 'tk-meteor-praha',
  description: 'Tenisový klub s venkovními i halovými kurty v Praze.',
  address: 'U Meteoru 6',
  city: 'Praha 10',
  country: 'Česko',
  phone: '+420 274 123 456',
  email: 'info@tkmeteor.cz',
  website: 'https://www.tkmeteor.cz',
  instagram: 'tkmeteorpraha',
  logo_url: null,
  cover_image_url: null,
  latitude: 50.0755,
  longitude: 14.4378,
  accepts_cash: true,
  accepts_card: true,
  accepts_multisport: true,
  allows_dogs: false,
  offers_food_drinks: true,
  food_drinks_description: 'Automat s pitím, káva a čaj v recepci.',
  offers_equipment_rental: true,
  equipment_rental_description: 'Tenisové rakety a košíčky na recepci.',
  sells_sport_equipment: false,
  sells_clothing: false,
  services_description: null,
  owner_id: 'owner1',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

export const MOCK_COURTS: CourtWithClub[] = [
  {
    id: 'c1',
    club_id: 'club1',
    club_name: 'TK Meteor Praha',
    club_city: 'Praha 7',
    name: 'Dvorec 1',
    sport: 'tennis',
    surface: 'clay',
    is_indoor: false,
    is_active: true,
    price_per_hour: 250,
    capacity: 4,
    category_id: 'cat_sparta_outdoor',
    pricing_category_ids: ['pc_tennis_weekday_am', 'pc_tennis_weekday_pm', 'pc_tennis_weekend'],
    available_today: 5,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'c2',
    club_id: 'club1',
    club_name: 'TK Meteor Praha',
    club_city: 'Praha 7',
    name: 'Dvorec 2',
    sport: 'tennis',
    surface: 'clay',
    is_indoor: false,
    is_active: true,
    price_per_hour: 250,
    capacity: 4,
    category_id: 'cat_sparta_outdoor',
    pricing_category_ids: ['pc_tennis_weekday_am', 'pc_tennis_weekday_pm', 'pc_tennis_weekend'],
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
    category_id: 'cat_badminton_hall',
    pricing_category_ids: ['pc_badminton_all'],
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
    category_id: 'cat_badminton_hall',
    pricing_category_ids: ['pc_badminton_all'],
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
    category_id: 'cat_squash',
    pricing_category_ids: ['pc_squash_evening'],
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
    pricing_category_ids: ['pc_padel_weekend'],
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
    club_name: 'TK Meteor Praha',
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

const MOCK_SUMMER_OPENING = {
  default: { openingSlot: 14, closingSlot: 43 },
  weekday: { openingSlot: 14, closingSlot: 43 },
  weekend: { openingSlot: 16, closingSlot: 42 },
  byDay: {} as Record<number, { openingSlot: number; closingSlot: number }>,
  dateOverrides: [] as { date: string; hours: { openingSlot: number; closingSlot: number } }[],
};

const MOCK_SUMMER_PRICING = {
  rules: [
    {
      id: 'pr_c1_weekday',
      courtId: 'c1',
      scope: 'weekday' as const,
      bands: [
        { fromSlot: 14, toSlot: 31, pricePerHour: 220 },
        { fromSlot: 32, toSlot: 43, pricePerHour: 280 },
      ],
    },
    {
      id: 'pr_c1_weekend',
      courtId: 'c1',
      scope: 'weekend' as const,
      bands: [
        { fromSlot: 16, toSlot: 42, pricePerHour: 300 },
      ],
    },
  ],
};

const MOCK_CATEGORY_PRICING = {
  cat_sparta_outdoor: {
    rules: [
      {
        id: 'pr_cat_sparta_weekday',
        categoryId: 'cat_sparta_outdoor',
        scope: 'weekday' as const,
        bands: [
          { fromSlot: 14, toSlot: 31, pricePerHour: 220 },
          { fromSlot: 32, toSlot: 43, pricePerHour: 280 },
        ],
      },
      {
        id: 'pr_cat_sparta_weekend',
        categoryId: 'cat_sparta_outdoor',
        scope: 'weekend' as const,
        bands: [
          { fromSlot: 16, toSlot: 42, pricePerHour: 300 },
        ],
      },
    ],
  },
};

const MOCK_PRICING_CATEGORIES = [
  {
    id: 'pc_tennis_weekday_am',
    name: 'Tenis — pracovní dny dopoledne',
    color: '#F97316',
    sport: 'tennis' as const,
    price_per_hour: 220,
    all_day: false,
    time_from_slot: 14,
    time_to_slot: 31,
    day_scope: 'weekdays' as const,
    season_scope: 'year_round' as const,
    court_ids: ['c1', 'c2'],
    is_active: true,
    sort_order: 10,
  },
  {
    id: 'pc_tennis_weekday_pm',
    name: 'Tenis — pracovní dny večer',
    color: '#3B82F6',
    sport: 'tennis' as const,
    price_per_hour: 280,
    all_day: false,
    time_from_slot: 32,
    time_to_slot: 43,
    day_scope: 'weekdays' as const,
    season_scope: 'year_round' as const,
    court_ids: ['c1', 'c2'],
    is_active: true,
    sort_order: 20,
  },
  {
    id: 'pc_tennis_weekend',
    name: 'Tenis — víkend',
    color: '#8B5CF6',
    sport: 'tennis' as const,
    price_per_hour: 300,
    all_day: true,
    day_scope: 'weekend' as const,
    season_scope: 'year_round' as const,
    court_ids: ['c1', 'c2'],
    is_active: true,
    sort_order: 30,
  },
  {
    id: 'pc_badminton_all',
    name: 'Badminton — celý den',
    color: '#14B8A6',
    sport: 'badminton' as const,
    price_per_hour: 180,
    all_day: true,
    day_scope: 'custom' as const,
    weekdays: [true, true, true, true, true, true, true],
    season_scope: 'year_round' as const,
    court_ids: ['c3', 'c4'],
    is_active: true,
    sort_order: 10,
  },
  {
    id: 'pc_squash_evening',
    name: 'Squash — pracovní večer',
    color: '#22C55E',
    sport: 'squash' as const,
    price_per_hour: 200,
    all_day: false,
    time_from_slot: 28,
    time_to_slot: 41,
    day_scope: 'weekdays' as const,
    season_scope: 'year_round' as const,
    court_ids: ['c5'],
    is_active: true,
    sort_order: 10,
  },
  {
    id: 'pc_padel_weekend',
    name: 'Padel — víkend',
    color: '#EC4899',
    sport: 'padel' as const,
    price_per_hour: 300,
    all_day: true,
    day_scope: 'weekend' as const,
    season_scope: 'year_round' as const,
    court_ids: ['c6'],
    is_active: true,
    sort_order: 10,
  },
];

export const MOCK_CLUB_SETTINGS: ClubSettings = {
  editLockHours:        24,
  openingSlot:          14,
  closingSlot:          43,
  maxBookingDaysAhead:  14,
  minBookingDurationMinutes: 60,
  earlyCloseEnabled:    false,
  earlyCloseSlot:       44,
  earlyCloseNote:       '',
  closurePeriods:       [],
  holidayTreatment:     'weekday',
  seasonalModeEnabled:  false,
  activeSeason:         'summer',
  openingSchedule:      MOCK_SUMMER_OPENING,
  pricing:              MOCK_SUMMER_PRICING,
  seasonPresets: {
    summer: {
      openingSchedule: MOCK_SUMMER_OPENING,
      pricing: MOCK_SUMMER_PRICING,
      holidayTreatment: 'weekday',
    },
    winter: {
      openingSchedule: {
        default: { openingSlot: 16, closingSlot: 40 },
        weekday: { openingSlot: 16, closingSlot: 40 },
        weekend: { openingSlot: 16, closingSlot: 38 },
        byDay: {},
        dateOverrides: [],
      },
      pricing: {
        rules: [
          {
            id: 'pr_c1_w_weekday',
            courtId: 'c1',
            scope: 'weekday',
            bands: [
              { fromSlot: 16, toSlot: 30, pricePerHour: 180 },
              { fromSlot: 31, toSlot: 40, pricePerHour: 220 },
            ],
          },
          {
            id: 'pr_c1_w_weekend',
            courtId: 'c1',
            scope: 'weekend',
            bands: [
              { fromSlot: 16, toSlot: 38, pricePerHour: 250 },
            ],
          },
        ],
      },
      holidayTreatment: 'weekend',
    },
  },
  autoSeasonByDate: false,
  seasonPeriods: {
    summer: { fromMMDD: '04-01', toMMDD: '09-30' },
    winter: { fromMMDD: '10-01', toMMDD: '03-31' },
  },
  courtSeasonSettings: {},
  dayOverrides: {},
  seasons: MOCK_SEASONS,
  categories: MOCK_COURT_CATEGORIES,
  categoryPricing: MOCK_CATEGORY_PRICING,
  pricingCategories: MOCK_PRICING_CATEGORIES,
  uncategorizedCourtOrder: ['c6'],
};
