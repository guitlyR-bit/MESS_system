-- ============================================================
-- MESS Tennis Platform — Initial Schema
-- Spusť v Supabase SQL editoru
-- ============================================================

-- Profily uživatelů (rozšíření auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('player', 'coach', 'club')),
  full_name    TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tenisové kluby
CREATE TABLE IF NOT EXISTS public.clubs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  slug         TEXT UNIQUE NOT NULL,
  description  TEXT,
  address      TEXT NOT NULL,
  city         TEXT NOT NULL,
  country      TEXT NOT NULL DEFAULT 'CZ',
  phone        TEXT,
  email        TEXT,
  website      TEXT,
  logo_url     TEXT,
  owner_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Kurty
CREATE TABLE IF NOT EXISTS public.courts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id          UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  surface          TEXT NOT NULL CHECK (surface IN ('clay', 'hard', 'grass', 'carpet', 'indoor')),
  is_indoor        BOOLEAN NOT NULL DEFAULT false,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  price_per_hour   DECIMAL(10, 2) NOT NULL DEFAULT 0,
  description      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rezervace
CREATE TABLE IF NOT EXISTS public.bookings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id     UUID NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  player_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  starts_at    TIMESTAMPTZ NOT NULL,
  ends_at      TIMESTAMPTZ NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes        TEXT,
  price        DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bookings_time_check CHECK (ends_at > starts_at)
);

-- Zápasy
CREATE TABLE IF NOT EXISTS public.matches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  player1_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player2_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  court_id     UUID NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  starts_at    TIMESTAMPTZ NOT NULL,
  score        TEXT,
  winner_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status       TEXT NOT NULL DEFAULT 'scheduled'
               CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches   ENABLE ROW LEVEL SECURITY;

-- Profily: veřejně čitelné, úprava pouze vlastního
CREATE POLICY "profiles_select_all"  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own"  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own"  ON public.profiles FOR UPDATE  USING (auth.uid() = user_id);

-- Kluby: veřejně čitelné, správa pouze vlastníka
CREATE POLICY "clubs_select_all"     ON public.clubs FOR SELECT USING (true);
CREATE POLICY "clubs_insert_owner"   ON public.clubs FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = owner_id)
);
CREATE POLICY "clubs_update_owner"   ON public.clubs FOR UPDATE USING (
  auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = owner_id)
);

-- Kurty: veřejně čitelné, správa vlastníka klubu
CREATE POLICY "courts_select_all"        ON public.courts FOR SELECT USING (true);
CREATE POLICY "courts_insert_club_owner" ON public.courts FOR INSERT WITH CHECK (
  auth.uid() IN (
    SELECT p.user_id FROM public.profiles p
    JOIN public.clubs c ON c.owner_id = p.id
    WHERE c.id = club_id
  )
);
CREATE POLICY "courts_update_club_owner" ON public.courts FOR UPDATE USING (
  auth.uid() IN (
    SELECT p.user_id FROM public.profiles p
    JOIN public.clubs c ON c.owner_id = p.id
    WHERE c.id = club_id
  )
);

-- Rezervace: vidí jen zúčastnění hráči/trenéři
CREATE POLICY "bookings_select_own"    ON public.bookings FOR SELECT USING (
  auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = player_id OR id = coach_id)
);
CREATE POLICY "bookings_insert_player" ON public.bookings FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = player_id)
);
CREATE POLICY "bookings_update_own"    ON public.bookings FOR UPDATE USING (
  auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = player_id OR id = coach_id)
);

-- Zápasy: veřejně čitelné, vkládají jen hráči zápasu
CREATE POLICY "matches_select_all"    ON public.matches FOR SELECT USING (true);
CREATE POLICY "matches_insert_player" ON public.matches FOR INSERT WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM public.profiles WHERE id = player1_id OR id = player2_id
  )
);

-- ============================================================
-- Trigger: automatická aktualizace updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER clubs_updated_at
  BEFORE UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
