/**
 * MESS Design System
 * MESS — Multifunkční Elektronický Sportovní Systém
 *
 * Světlý základ (bílá + šedá) + teplé akcentové barvy (oranžová, růžová, žlutá)
 * Černá pro kontrasní text a detaily
 */

// ─── Barvy ────────────────────────────────────────────────────────────────────

export const colors = {
  // Pozadí (světlá neutrální škála)
  bg:         '#F7F6F3', // hlavní pozadí — teplá bílá
  bgAlt:      '#EFEDE9', // lehce tmavší, pro sekce
  surface:    '#FFFFFF', // karta, panel
  surfaceAlt: '#F2F1EE', // zvýrazněná karta / hover

  // Ohraničení
  border:       '#E2DED8',
  borderStrong: '#C8C3BB',

  // Text
  textPrimary:   '#111111', // skoro černá — hlavní text
  textSecondary: '#555555', // středně šedá
  textMuted:     '#888888', // popis, hint
  textDisabled:  '#BBBBBB', // neaktivní
  textInverse:   '#FFFFFF', // text na tmavém pozadí

  // Černá (pro kontrasní prvky, ikony, outline)
  black: '#111111',
  blackSoft: '#1F1F1F',

  // ── Teplá akcent paleta ──────────────────────────────────────────────────
  // Hráč — oranžová (energie, pohyb)
  player: {
    accent:       '#F97316', // orange-500
    accentLight:  '#FED7AA', // orange-200
    accentFade:   '#FFF7ED', // orange-50
    accentDark:   '#C2410C', // orange-700
    gradient:     ['#FFF7ED', '#FFECD3'] as const,
  },
  // Trenér — červená/růžová (vášeň, leadership)
  coach: {
    accent:       '#F43F5E', // rose-500
    accentLight:  '#FECDD3', // rose-200
    accentFade:   '#FFF1F2', // rose-50
    accentDark:   '#BE123C', // rose-700
    gradient:     ['#FFF1F2', '#FFE0E6'] as const,
  },
  // Klub — žlutá/jantarová (komunita, prestiž)
  club: {
    accent:       '#EAB308', // yellow-500
    accentLight:  '#FEF08A', // yellow-200
    accentFade:   '#FEFCE8', // yellow-50
    accentDark:   '#A16207', // yellow-700
    gradient:     ['#FEFCE8', '#FEF3C7'] as const,
  },

  // ── Volná teplá paleta — pro mixování akcentů napříč obrazovkami ──────────
  warm: {
    orange: '#F97316',  // živá oranžová
    amber:  '#F59E0B',  // jantarová
    yellow: '#EAB308',  // žlutá
    red:    '#EF4444',  // červená
    rose:   '#F43F5E',  // růžová/červená
    pink:   '#EC4899',  // sytá růžová
  },
  warmFade: {
    orange: '#FFF7ED',
    amber:  '#FFFBEB',
    yellow: '#FEFCE8',
    red:    '#FEF2F2',
    rose:   '#FFF1F2',
    pink:   '#FDF2F8',
  },

  // Stavové barvy
  success:  '#16A34A',
  warning:  '#D97706',
  error:    '#DC2626',
  info:     '#2563EB',
} as const;

// ─── Typografie (4 stupně — záměrně jednoduché) ───────────────────────────────

export const typography = {
  // Velký nadpis — logo, hero
  title: {
    fontSize: 36,
    fontWeight: '800' as const,
    lineHeight: 42,
    color: colors.textPrimary,
  },
  // Nadpis sekce / karty
  heading: {
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 26,
    color: colors.textPrimary,
  },
  // Tělo textu
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  // Malý popisek
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    color: colors.textMuted,
  },
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  '2xl': 48,
} as const;

// ─── Border radius ────────────────────────────────────────────────────────────

export const radius = {
  none: 0,
  sm:   2,
  md:   4,
  lg:   6,
  xl:   8,
  full: 9999,
} as const;

// ─── Stíny — brutalistický offset stín (nulový blur, pevný posun) ─────────────

export const shadows = {
  sm: {
    shadowColor: '#111111',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  md: {
    shadowColor: '#111111',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  lg: {
    shadowColor: '#111111',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
} as const;

// ─── Brutalism tokeny ─────────────────────────────────────────────────────────

export const brutalism = {
  borderWidth: 2,
  borderColor: '#111111',
  accentBarWidth: 6,
} as const;

// ─── Breakpointy ─────────────────────────────────────────────────────────────

export const breakpoints = {
  mobile:  0,
  tablet:  768,
  desktop: 1024,
} as const;

// ─── Export ───────────────────────────────────────────────────────────────────

export const theme = { colors, typography, spacing, radius, shadows, brutalism, breakpoints } as const;
export type Theme = typeof theme;
