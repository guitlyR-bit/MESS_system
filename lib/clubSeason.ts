import type {
  ClubSettings,
  SeasonId,
  SeasonProfile,
  SeasonPresets,
  OpeningSchedule,
  ClubPricing,
  SeasonPeriod,
  CourtSeasonSettings,
} from '@/types/database';
import { slotToTime, slotEndTime, localDateKey } from '@/lib/mockData';

export const SEASON_IDS: SeasonId[] = ['summer', 'winter'];

export const SEASON_LABELS: Record<SeasonId, string> = {
  summer: 'Léto',
  winter: 'Zima',
};

export function cloneOpeningSchedule(s: OpeningSchedule): OpeningSchedule {
  return {
    ...s,
    default: { ...s.default },
    weekday: s.weekday ? { ...s.weekday } : undefined,
    weekend: s.weekend ? { ...s.weekend } : undefined,
    byDay: s.byDay ? { ...Object.fromEntries(
      Object.entries(s.byDay).map(([k, v]) => [k, { ...v! }]),
    ) } : undefined,
    dateOverrides: s.dateOverrides?.map(o => ({ ...o, hours: { ...o.hours } })) ?? [],
  };
}

export function clonePricing(p: ClubPricing): ClubPricing {
  return {
    rules: p.rules.map(r => ({
      ...r,
      bands: r.bands.map(b => ({ ...b })),
    })),
  };
}

export function cloneSeasonProfile(p: SeasonProfile): SeasonProfile {
  return {
    openingSchedule: cloneOpeningSchedule(p.openingSchedule),
    pricing: clonePricing(p.pricing),
    holidayTreatment: p.holidayTreatment,
  };
}

export function cloneSeasonPresets(presets: SeasonPresets): SeasonPresets {
  return {
    summer: cloneSeasonProfile(presets.summer),
    winter: cloneSeasonProfile(presets.winter),
  };
}

export function cloneCourtSeasonSettings(c: CourtSeasonSettings): CourtSeasonSettings {
  return {
    ...c,
    seasonPresets: c.seasonPresets ? cloneSeasonPresets(c.seasonPresets) : undefined,
  };
}

export function profileFromActiveSettings(settings: ClubSettings): SeasonProfile {
  return {
    openingSchedule: cloneOpeningSchedule(settings.openingSchedule),
    pricing: clonePricing(settings.pricing),
    holidayTreatment: settings.holidayTreatment,
  };
}

export function activeFieldsFromProfile(profile: SeasonProfile): Pick<
  ClubSettings,
  'openingSchedule' | 'pricing' | 'holidayTreatment' | 'openingSlot' | 'closingSlot'
> {
  return {
    openingSchedule: profile.openingSchedule,
    pricing: profile.pricing,
    holidayTreatment: profile.holidayTreatment,
    openingSlot: profile.openingSchedule.default.openingSlot,
    closingSlot: profile.openingSchedule.default.closingSlot,
  };
}

export function dateKeyToMMDD(dateKey: string): string {
  return dateKey.slice(5);
}

export function isDateInSeasonPeriod(dateKey: string, period: SeasonPeriod): boolean {
  const mmdd = dateKeyToMMDD(dateKey);
  const { fromMMDD, toMMDD } = period;
  if (fromMMDD <= toMMDD) {
    return mmdd >= fromMMDD && mmdd <= toMMDD;
  }
  return mmdd >= fromMMDD || mmdd <= toMMDD;
}

/** Sezóna platná pro dané kalendářní datum */
export function resolveSeasonId(dateKey: string, settings: ClubSettings): SeasonId {
  if (isDateInSeasonPeriod(dateKey, settings.seasonPeriods.summer)) return 'summer';
  return 'winter';
}

export function getEffectiveSeasonId(dateKey: string, settings: ClubSettings): SeasonId {
  if (!settings.seasonalModeEnabled) return settings.activeSeason;
  if (settings.autoSeasonByDate) return resolveSeasonId(dateKey, settings);
  return settings.activeSeason;
}

export function getSeasonProfileForDate(
  settings: ClubSettings,
  dateKey: string,
): SeasonProfile {
  if (!settings.seasonalModeEnabled) {
    return profileFromActiveSettings(settings);
  }
  const season = getEffectiveSeasonId(dateKey, settings);
  return cloneSeasonProfile(settings.seasonPresets[season]);
}

export function mergeSettingsForDate(
  settings: ClubSettings,
  dateKey: string,
): ClubSettings {
  if (!settings.seasonalModeEnabled) return settings;
  const profile = getSeasonProfileForDate(settings, dateKey);
  return { ...settings, ...activeFieldsFromProfile(profile) };
}

export function isCourtSeasonallyClosed(
  courtId: string,
  dateKey: string,
  settings: ClubSettings,
): boolean {
  if (!settings.seasonalModeEnabled) return false;
  const cfg = settings.courtSeasonSettings[courtId];
  if (!cfg) return false;
  const season = getEffectiveSeasonId(dateKey, settings);
  return season === 'summer' ? cfg.closedInSummer : cfg.closedInWinter;
}

export function getCourtSeasonProfile(
  courtId: string,
  dateKey: string,
  settings: ClubSettings,
): SeasonProfile {
  const clubProfile = getSeasonProfileForDate(settings, dateKey);
  const cfg = settings.courtSeasonSettings[courtId];
  if (cfg?.useCustomProfiles && cfg.seasonPresets) {
    const season = getEffectiveSeasonId(dateKey, settings);
    return cloneSeasonProfile(cfg.seasonPresets[season]);
  }
  return clubProfile;
}

export function mergeSettingsForCourt(
  settings: ClubSettings,
  courtId: string,
  dateKey: string,
): ClubSettings {
  const profile = getCourtSeasonProfile(courtId, dateKey, settings);
  return { ...settings, ...activeFieldsFromProfile(profile) };
}

export function formatSeasonPeriod(period: SeasonPeriod): string {
  const fmt = (mmdd: string) => {
    const [m, d] = mmdd.split('-');
    return `${Number(d)}.${Number(m)}.`;
  };
  return `${fmt(period.fromMMDD)} – ${fmt(period.toMMDD)}`;
}

export function patchForEnableSeasonalMode(settings: ClubSettings): Partial<ClubSettings> {
  const current = profileFromActiveSettings(settings);
  const presets = cloneSeasonPresets(settings.seasonPresets);
  presets.summer = cloneSeasonProfile(current);
  const season = settings.autoSeasonByDate
    ? resolveSeasonId(localDateKey(), settings)
    : (settings.activeSeason ?? 'summer');
  return {
    seasonalModeEnabled: true,
    activeSeason: season,
    autoSeasonByDate: settings.autoSeasonByDate ?? false,
    seasonPeriods: settings.seasonPeriods ?? {
      summer: { fromMMDD: '04-01', toMMDD: '09-30' },
      winter: { fromMMDD: '10-01', toMMDD: '03-31' },
    },
    courtSeasonSettings: settings.courtSeasonSettings ?? {},
    seasonPresets: presets,
    ...activeFieldsFromProfile(presets[season]),
  };
}

export function patchForDisableSeasonalMode(settings: ClubSettings): Partial<ClubSettings> {
  const presets = cloneSeasonPresets(settings.seasonPresets);
  if (settings.seasonalModeEnabled) {
    presets[settings.activeSeason] = profileFromActiveSettings(settings);
  }
  return {
    seasonalModeEnabled: false,
    seasonPresets: presets,
  };
}

export function patchForSwitchSeason(
  settings: ClubSettings,
  newSeason: SeasonId,
): Partial<ClubSettings> {
  if (!settings.seasonalModeEnabled || settings.autoSeasonByDate) return {};
  if (newSeason === settings.activeSeason) return {};

  const presets = cloneSeasonPresets(settings.seasonPresets);
  presets[settings.activeSeason] = profileFromActiveSettings(settings);

  return {
    activeSeason: newSeason,
    autoSeasonByDate: false,
    seasonPresets: presets,
    ...activeFieldsFromProfile(presets[newSeason]),
  };
}

export function applySettingsPatch(
  settings: ClubSettings,
  updates: Partial<ClubSettings>,
): Partial<ClubSettings> {
  if (!settings.seasonalModeEnabled) return updates;

  const merged: ClubSettings = { ...settings, ...updates };
  const preset = profileFromActiveSettings(merged);

  return {
    ...updates,
    seasonPresets: {
      ...settings.seasonPresets,
      [settings.activeSeason]: preset,
    },
  };
}

export function formatSeasonProfileSummary(profile: SeasonProfile): string {
  const def = profile.openingSchedule.default;
  return `${slotToTime(def.openingSlot)}–${slotEndTime(def.closingSlot)} · ${profile.pricing.rules.length} cen. pravidel`;
}

export function defaultCourtSeasonSettings(settings: ClubSettings): CourtSeasonSettings {
  const club = cloneSeasonPresets(settings.seasonPresets);
  return {
    useCustomProfiles: false,
    closedInSummer: false,
    closedInWinter: false,
    seasonPresets: club,
  };
}
