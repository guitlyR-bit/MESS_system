import type { ClubSettings } from '@/types/database';
import { MOCK_CLUB_SETTINGS } from '@/lib/mockData';
import { cloneSeasonPresets, cloneCourtSeasonSettings } from '@/lib/clubSeason';

function cloneSettings(src: ClubSettings): ClubSettings {
  return {
    ...src,
    closurePeriods: [...src.closurePeriods],
    openingSchedule: {
      ...src.openingSchedule,
      byDay: { ...src.openingSchedule.byDay },
      dateOverrides: src.openingSchedule.dateOverrides?.map(o => ({ ...o, hours: { ...o.hours } })) ?? [],
    },
    pricing: {
      rules: src.pricing.rules.map(r => ({
        ...r,
        bands: r.bands.map(b => ({ ...b })),
      })),
    },
    seasonPresets: cloneSeasonPresets(src.seasonPresets),
    seasonPeriods: {
      summer: { ...src.seasonPeriods.summer },
      winter: { ...src.seasonPeriods.winter },
    },
    courtSeasonSettings: Object.fromEntries(
      Object.entries(src.courtSeasonSettings ?? {}).map(([k, v]) => [k, cloneCourtSeasonSettings(v)]),
    ),
  };
}

let clubSettings: ClubSettings = cloneSettings(MOCK_CLUB_SETTINGS);
const listeners = new Set<() => void>();

export function getClubSettingsSnapshot(): ClubSettings {
  return clubSettings;
}

export function subscribeClubSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function patchClubSettings(updates: Partial<ClubSettings>): ClubSettings {
  clubSettings = { ...clubSettings, ...updates };
  listeners.forEach(l => l());
  return clubSettings;
}
