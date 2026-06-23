# MESS – Tennis Management System

Multiplatformní tenisová platforma pro **hráče**, **trenéry** a **kluby**.  
Postavena na Expo (React Native + Web), TypeScript, Expo Router, NativeWind a Supabase.

---

## Požadavky

**Doporučená verze Node.js: 20 LTS nebo 22 LTS.**  
S Node.js 24 může `expo start` selhat s chybou `TypeError: _ws(...).WebSocketServer is not a constructor` kvůli nekompatibilitě bundlovaného modulu `ws` v Expo CLI.

---

## Rychlý start

### 1. Instalace závislostí

```bash
npm install
```

### 2. Nastavení prostředí

Zkopíruj `.env.example` do `.env` a vyplň hodnoty ze svého Supabase projektu:

```bash
cp .env.example .env
```

```env
EXPO_PUBLIC_SUPABASE_URL=https://tvuj-projekt.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tvuj-anon-klic
```

### 3. Databáze

V **Supabase → SQL Editor** spusť celý obsah souboru:

```
supabase/migrations/001_initial.sql
```

Tím se vytvoří tabulky `profiles`, `clubs`, `courts`, `bookings`, `matches` + RLS politiky.

### 4. Spuštění aplikace

```bash
# Expo Go (mobil) — naskenuj QR kód
npm start

# Web prohlížeč
npm run web

# Android
npm run android

# iOS
npm run ios
```

---

## Struktura projektu

```
app/
  index.tsx              ← Úvodní obrazovka výběru role (Hráč / Trenér / Klub)
  _layout.tsx            ← Root Stack layout
  (auth)/                ← Přihlášení a registrace
    login.tsx
    register.tsx
  (player)/              ← Tab menu hráče (Domů, Kurty, Zápasy, Profil)
  (coach)/               ← Tab menu trenéra (Domů, Rozvrh, Hráči, Profil)
  (club)/                ← Tab menu klubu (Domů, Kurty, Členové, Profil)

components/
  ui/
    Button.tsx           ← Opakovaně použitelné tlačítko
    Card.tsx             ← Karta / kontejner
    Input.tsx            ← Textové pole s labelem a validací

lib/
  supabase.ts            ← Supabase klient (SecureStore adapter)
  constants.ts           ← Barvy, konstanty aplikace

types/
  database.ts            ← TypeScript typy pro databázi

hooks/
  useRole.ts             ← Konfigurace rolí
  useAuth.ts             ← Placeholder pro Supabase auth

supabase/
  migrations/
    001_initial.sql      ← Schéma databáze + RLS politiky
```

---

## Role v systému

| Role   | Popis                                               | Accent barva |
|--------|-----------------------------------------------------|--------------|
| Hráč   | Rezervace kurtů, zápasy, výsledky                  | `#2D9148`    |
| Trenér | Správa svěřenců, tréninků, rozvrhů                 | `#2980B9`    |
| Klub   | Správa kurtů, členů, ceníků a rezervací             | `#D4A017`    |

---

## Technologie

| Technologie              | Verze       | Účel                              |
|--------------------------|-------------|-----------------------------------|
| Expo SDK                 | ^56.0.0     | Cross-platform framework          |
| Expo Router              | ^56.0.0     | File-based routing                |
| NativeWind               | ^4.1.23     | Tailwind CSS pro React Native     |
| Tailwind CSS             | ^3.4.17     | Utility-first stylování           |
| Supabase JS              | ^2.49.4     | Databáze, auth, realtime          |
| expo-secure-store        | ^56.0.0     | Bezpečné ukládání tokenů          |
| react-native-url-polyfill| ^2.0.0      | URL polyfill pro Supabase         |

---

## Další kroky (MVP)

- [ ] Implementace Supabase autentizace (`supabase.auth.signIn`)
- [ ] Rezervační systém s výběrem kurtu a časového slotu
- [ ] Profil hráče se statistikami
- [ ] Push notifikace (expo-notifications)
- [ ] Admin panel pro kluby
- [ ] Supabase Realtime pro živé aktualizace rezervací
