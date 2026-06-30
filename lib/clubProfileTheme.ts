import type { Club } from '@/types/database';
import { colors } from '@/lib/theme';
import { CATEGORY_COLORS } from '@/lib/mockData';

const ACCENT_FADE_MAP: Record<string, string> = {
  '#EAB308': colors.club.accentFade,
  '#F97316': colors.warmFade.orange,
  '#3B82F6': '#EFF6FF',
  '#22C55E': '#F0FDF4',
  '#8B5CF6': '#F5F3FF',
  '#EF4444': colors.warmFade.red,
  '#14B8A6': '#F0FDFA',
  '#EC4899': colors.warmFade.pink,
  '#F43F5E': colors.warmFade.rose,
  '#F59E0B': colors.warmFade.amber,
};

export const CLUB_PROFILE_COLOR_OPTIONS = [
  ...CATEGORY_COLORS.map(c => ({ hex: c.hex, label: c.label })),
  { hex: colors.warm.rose, label: 'Růžová' },
  { hex: colors.warm.amber, label: 'Jantarová' },
] as const;

export interface ClubProfileTheme {
  accent: string;
  accentFade: string;
}

function normalizeHex(hex: string): string {
  return hex.trim().toUpperCase();
}

export function resolveClubProfileTheme(
  profile: Pick<Club, 'profile_accent_color'>,
): ClubProfileTheme {
  const accent = profile.profile_accent_color?.trim() || colors.club.accent;
  const accentFade = ACCENT_FADE_MAP[normalizeHex(accent)] ?? colors.club.accentFade;
  return { accent, accentFade };
}
