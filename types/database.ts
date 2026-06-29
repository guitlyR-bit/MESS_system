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
  instagram?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** Platba hotově na místě */
  accepts_cash?: boolean;
  /** Platba kartou */
  accepts_card?: boolean;
  /** Akceptace Multisport karet */
  accepts_multisport?: boolean;
  /** Psi v areálu klubu */
  allows_dogs?: boolean;
  /** Pití a občerstvení k dispozici */
  offers_food_drinks?: boolean;
  /** Popis jídla a pití v klubu */
  food_drinks_description?: string | null;
  /** Půjčování sportovního vybavení */
  offers_equipment_rental?: boolean;
  /** Co lze zapůjčit */
  equipment_rental_description?: string | null;
  /** Prodej sportovního vybavení */
  sells_sport_equipment?: boolean;
  /** Prodej sportovního oblečení */
  sells_clothing?: boolean;
  /** Doplňující popis služeb klubu */
  services_description?: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export type CourtSurface = 'clay' | 'hard' | 'grass' | 'carpet' | 'indoor';
export type SportType = 'tennis' | 'badminton' | 'squash' | 'padel' | 'volleyball' | 'basketball' | 'football';

/** Kalendářní sezóna klubu (např. letní/zimní období) */
export interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  /** Celá sezóna uzavřena — kurty v kategoriích této sezóny nelze rezervovat v jejím období */
  is_closed?: boolean;
}

/** Seskupení kurtů — společná provozní doba a ceník */
export interface CourtCategory {
  id: string;
  name: string;
  court_ids: string[];
  /** Barva kategorie — hex nebo id z CATEGORY_COLORS */
  color: string;
  /** Sezóna, pro kterou kategorie platí */
  season_id?: string;
}

/** Sport v cenové kategorii — 'all' = všechny sporty */
export type PricingSport = 'tennis' | 'squash' | 'padel' | 'badminton' | 'all';

export type PricingSeasonScope = 'year_round' | 'summer' | 'winter';

export type PricingDayScope =
  | 'weekdays'
  | 'weekend'
  | 'holidays'
  | 'custom';

/** Cenová kategorie — pravidlo ceny nezávislé na kurtu, s přiřazením kurtům */
export interface PricingCategory {
  id: string;
  name: string;
  sport: PricingSport;
  price_per_hour: number;
  /** Celý den nebo časové rozmezí */
  all_day: boolean;
  time_from_slot?: number;
  time_to_slot?: number;
  day_scope: PricingDayScope;
  /** Pouze pokud day_scope === 'custom' — [Po,Út,St,Čt,Pá,So,Ne] */
  weekdays?: boolean[];
  season_scope: PricingSeasonScope;
  court_ids: string[];
  is_active: boolean;
  sort_order?: number;
}

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
  category_id?: string;
  /** Přiřazené aktivní cenové kategorie (sync s PricingCategory.court_ids) */
  pricing_category_ids?: string[];
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
  /** Bez categoryId/courtId = celý klub; s categoryId = jen kurty v kategorii; s courtId = jeden kurt */
  categoryId?: string;
  courtId?: string;
  /** Částečné uzavření kurtu — slot indexy 0–47 (30 min); oba musí být nastaveny */
  closedFromSlot?: number;
  closedToSlot?: number;
  note?: string;
}

/** Provozní doba — slot indexy 0–47 (30 min) */
export interface DayHours {
  openingSlot: number;
  closingSlot: number;
}

/** Částečný override provozní doby pro konkrétní kalendářní den (YYYY-MM-DD) */
export interface DayHoursPartialOverride {
  openingSlot?: number;
  closingSlot?: number;
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

/** Cenové pravidlo — platí pro kurt nebo celou kategorii kurtů */
export interface CourtPriceRule {
  id: string;
  courtId?: string;
  categoryId?: string;
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
  /** Minimální délka rezervace v minutách (30, 60, 90, 120, 150, 180) */
  minBookingDurationMinutes: number;
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
  /** Admin override provozní doby pro jednotlivé dny — klíč YYYY-MM-DD */
  dayOverrides?: Record<string, DayHoursPartialOverride>;
  /** Kalendářní sezóny klubu */
  seasons: Season[];
  /** Seskupení kurtů pro hromadné nastavení provozu a ceníku */
  categories: CourtCategory[];
  /** Vlastní rozvrh otevírací doby per kategorie (fallback = globální openingSchedule) */
  categoryOpeningSchedule?: Record<string, OpeningSchedule>;
  /** Denní výjimky provozní doby per kategorie — categoryId → dateKey → override */
  categoryDayOverrides?: Record<string, Record<string, DayHoursPartialOverride>>;
  /** @deprecated Použijte pricingCategories */
  categoryPricing?: Record<string, ClubPricing>;
  /** Cenové kategorie klubu — nezávislá pravidla s přiřazením kurtům */
  pricingCategories?: PricingCategory[];
  /** Pořadí nezařazených kurtů (category order = pořadí v categories[], court order = court_ids[]) */
  uncategorizedCourtOrder?: string[];
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
