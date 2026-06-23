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
