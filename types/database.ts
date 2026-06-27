export type UserRole = 'player' | 'coach' | 'club';

export interface Profile {
  id: string;
  user_id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Club {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  address: string;
  city: string;
  country: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logo_url?: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export type CourtSurface = 'clay' | 'hard' | 'grass' | 'carpet' | 'indoor';
export type SportType = 'tennis' | 'badminton' | 'squash' | 'padel' | 'volleyball' | 'basketball' | 'football';

export interface Court {
  id: string;
  club_id: string;
  name: string;
  sport: SportType;
  surface: CourtSurface;
  is_indoor: boolean;
  is_active: boolean;
  price_per_hour: number;
  capacity: number;       // max hráčů
  description?: string | null;
  created_at: string;
}

// Rozšířený typ pro zobrazení v UI (s daty klubu)
export interface CourtWithClub extends Court {
  club_name: string;
  club_city: string;
  available_today: number;  // počet volných slotů dnes
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Booking {
  id: string;
  court_id: string;
  player_id: string;
  coach_id?: string | null;
  starts_at: string;   // ISO string
  ends_at: string;     // ISO string
  status: BookingStatus;
  notes?: string | null;
  price: number;
  created_at: string;
}

// Pro zobrazení v UI (s daty kurtu a klubu)
export interface BookingWithCourt extends Booking {
  court_name: string;
  court_sport: SportType;
  club_name: string;
  club_city: string;
  slots?: number[];   // 30min slot indexy (0–29); umožňuje přesnou editaci
}

// ─── Club admin types ─────────────────────────────────────────────────────────

export type PaymentStatus = 'paid' | 'pay_on_site' | 'pending';

/** Rezervace viditelná správcem klubu — obsahuje jméno hráče a platební stav */
export interface ClubBooking {
  id: string;
  court_id: string;
  player_name: string;
  date: string;           // 'YYYY-MM-DD'
  starts_at: string;
  ends_at: string;
  slots: number[];        // seřazené slot indexy (0–29)
  price: number;
  payment_status: PaymentStatus;
  status: 'confirmed' | 'cancelled';
  note?: string;
}

/** Uzavření sportoviště v kalendářním termínu (včetně obou koncových dnů) */
export interface ClubClosurePeriod {
  id: string;
  fromDate: string;   // YYYY-MM-DD
  toDate: string;     // YYYY-MM-DD
  note?: string;
}

/** Provozní doba — slot indexy 0–47 (30 min) */
export interface DayHours {
  openingSlot: number;
  closingSlot: number;
}

/** 0 = pondělí … 6 = neděle */
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface DateHoursOverride {
  date: string;
  hours: DayHours;
}

/** Rozvrh otevírací doby — výchozí, pracovní dny, víkend, jednotlivé dny */
export interface OpeningSchedule {
  default: DayHours;
  weekday?: DayHours;
  weekend?: DayHours;
  byDay?: Partial<Record<WeekdayIndex, DayHours>>;
  dateOverrides?: DateHoursOverride[];
}

/** Jak se chovají automaticky rozpoznané státní svátky */
export type HolidayTreatment = 'weekday' | 'weekend';

/** Rozsah platnosti cenového pravidla */
export type PriceDayScope = 'all' | 'weekday' | 'weekend' | 'holiday' | WeekdayIndex;

/** Časové pásmo s cenou za hodinu */
export interface PriceTimeBand {
  fromSlot: number;
  toSlot: number;
  pricePerHour: number;
}

/** Cenové pravidlo pro kurt — platí pro zvolený rozsah dnů a časová pásma */
export interface CourtPriceRule {
  id: string;
  courtId: string;
  scope: PriceDayScope;
  bands: PriceTimeBand[];
}

export interface ClubPricing {
  rules: CourtPriceRule[];
}

/** Sezónní profil — provozní doba + ceník pro léto / zimu */
export type SeasonId = 'summer' | 'winter';

export interface SeasonProfile {
  openingSchedule: OpeningSchedule;
  pricing: ClubPricing;
  holidayTreatment: HolidayTreatment;
}

export interface SeasonPresets {
  summer: SeasonProfile;
  winter: SeasonProfile;
}

/** Období sezóny (MM-DD, opakuje se každý rok; zima může přes rok) */
export interface SeasonPeriod {
  fromMMDD: string;
  toMMDD: string;
}

/** Sezónní nastavení jednotlivého kurtu */
export interface CourtSeasonSettings {
  useCustomProfiles: boolean;
  closedInSummer: boolean;
  closedInWinter: boolean;
  seasonPresets?: SeasonPresets;
}

/** Nastavení klubu — editační zámek, provozní doba, uzavření */
export interface ClubSettings {
  editLockHours: number;
  openingSlot: number;
  closingSlot: number;
  maxBookingDaysAhead: number;
  earlyCloseEnabled: boolean;
  earlyCloseSlot: number;
  earlyCloseNote?: string;
  closurePeriods: ClubClosurePeriod[];
  openingSchedule: OpeningSchedule;
  holidayTreatment: HolidayTreatment;
  pricing: ClubPricing;
  seasonalModeEnabled: boolean;
  /** Automaticky volit sezónu podle data (místo ručního přepínače) */
  autoSeasonByDate: boolean;
  activeSeason: SeasonId;
  seasonPeriods: { summer: SeasonPeriod; winter: SeasonPeriod };
  seasonPresets: SeasonPresets;
  courtSeasonSettings: Record<string, CourtSeasonSettings>;
}

export type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface Match {
  id: string;
  booking_id?: string | null;
  player1_id: string;
  player2_id: string;
  court_id: string;
  starts_at: string;
  score?: string | null;
  winner_id?: string | null;
  status: MatchStatus;
  created_at: string;
}

// Supabase generated types shape (expand as needed)
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      clubs: {
        Row: Club;
        Insert: Omit<Club, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Club, 'id' | 'created_at'>>;
      };
      courts: {
        Row: Court;
        Insert: Omit<Court, 'id' | 'created_at'>;
        Update: Partial<Omit<Court, 'id' | 'created_at'>>;
      };
      bookings: {
        Row: Booking;
        Insert: Omit<Booking, 'id' | 'created_at'>;
        Update: Partial<Omit<Booking, 'id' | 'created_at'>>;
      };
      matches: {
        Row: Match;
        Insert: Omit<Match, 'id' | 'created_at'>;
        Update: Partial<Omit<Match, 'id' | 'created_at'>>;
      };
    };
  };
};
