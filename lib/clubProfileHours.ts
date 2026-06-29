import type { ClubSettings, DayHours } from '@/types/database';
import { localDateKey, fmtDay, slotToTime } from '@/lib/mockData';
import {
  mergeSettingsForDate,
  getEffectiveSeasonId,
  SEASON_LABELS,
} from '@/lib/clubSeason';
import {
  getScheduledDayHours,
  getDayHoursForDate,
  formatDayHours,
  hasDayHoursOverride,
  getDayHoursForCourt,
  hasCategoryDayHoursOverride,
  WEEKDAY_NAMES,
  getWeekdayIndex,
} from '@/lib/clubSchedule';
import {
  isDateFullyClosed,
  getClosureMessageForDate,
  fmtDateKey,
} from '@/lib/clubClosure';
import { getCzechHoliday, holidayTreatmentLabel } from '@/lib/czechHolidays';
import { getCategoryById } from '@/lib/clubCategories';

export interface ExtraordinaryOpeningEntry {
  id: string;
  dateLabel: string;
  hoursLabel: string;
  baselineLabel?: string;
  detail?: string;
}

export interface ClubOpeningHoursProfile {
  seasonLabel?: string;
  holidayToday?: string;
  todayLabel: string;
  todayHoursLabel: string;
  scheduleLines: string[];
  holidayTreatment: string;
  extraordinary: ExtraordinaryOpeningEntry[];
  hasExtraordinary: boolean;
}

function effectiveHoursForDisplay(dateKey: string, settings: ClubSettings): DayHours | null {
  const dateSettings = mergeSettingsForDate(settings, dateKey);
  if (isDateFullyClosed(dateKey, dateSettings)) return null;
  const base = getDayHoursForDate(dateKey, dateSettings);
  const todayKey = localDateKey();
  if (dateKey === todayKey && dateSettings.earlyCloseEnabled) {
    const closing = Math.min(base.closingSlot, dateSettings.earlyCloseSlot - 1);
    return { openingSlot: base.openingSlot, closingSlot: closing };
  }
  return base;
}

function dateLabelForKey(dateKey: string, todayKey: string): string {
  if (dateKey === todayKey) {
    const d = new Date(dateKey + 'T12:00:00');
    const weekday = WEEKDAY_NAMES[getWeekdayIndex(dateKey)];
    const fmt = fmtDay(d);
    return `Dnes (${weekday} ${fmt.num}. ${fmt.month})`;
  }
  return fmtDateKey(dateKey);
}

function collectExtraordinaryForDate(
  dateKey: string,
  settings: ClubSettings,
  todayKey: string,
): ExtraordinaryOpeningEntry[] {
  const entries: ExtraordinaryOpeningEntry[] = [];
  const dateSettings = mergeSettingsForDate(settings, dateKey);
  const dateLabel = dateLabelForKey(dateKey, todayKey);
  const scheduled = getScheduledDayHours(dateKey, dateSettings);

  if (isDateFullyClosed(dateKey, dateSettings)) {
    entries.push({
      id: `close-${dateKey}`,
      dateLabel,
      hoursLabel: 'Uzavřeno',
      detail: getClosureMessageForDate(dateKey, dateSettings) ?? undefined,
    });
    return entries;
  }

  if (hasDayHoursOverride(dateKey, settings)) {
    entries.push({
      id: `override-${dateKey}`,
      dateLabel,
      hoursLabel: formatDayHours(getDayHoursForDate(dateKey, settings)),
      baselineLabel: `Běžně ${formatDayHours(scheduled)}`,
    });
  }

  if (dateKey === todayKey && dateSettings.earlyCloseEnabled) {
    const withoutEarly = getDayHoursForDate(dateKey, settings);
    const effective = effectiveHoursForDisplay(dateKey, settings);
    if (effective && effective.closingSlot < withoutEarly.closingSlot) {
      entries.push({
        id: `early-${dateKey}`,
        dateLabel,
        hoursLabel: `Uzavřeno od ${slotToTime(dateSettings.earlyCloseSlot)}`,
        baselineLabel: `Běžně ${formatDayHours(withoutEarly)}`,
        detail: dateSettings.earlyCloseNote?.trim() || undefined,
      });
    }
  }

  if (settings.categoryDayOverrides) {
    for (const [categoryId, dates] of Object.entries(settings.categoryDayOverrides)) {
      if (!dates[dateKey] || !hasCategoryDayHoursOverride(categoryId, dateKey, settings)) continue;
      const cat = getCategoryById(settings, categoryId);
      if (!cat?.court_ids[0]) continue;
      entries.push({
        id: `cat-${dateKey}-${categoryId}`,
        dateLabel: `${dateLabel} · ${cat.name}`,
        hoursLabel: formatDayHours(getDayHoursForCourt(cat.court_ids[0], dateKey, settings)),
        baselineLabel: `Běžně ${formatDayHours(scheduled)}`,
      });
    }
  }

  return entries;
}

function relevantDateKeys(settings: ClubSettings, todayKey: string): string[] {
  const keys = new Set<string>([todayKey]);
  Object.keys(settings.dayOverrides ?? {}).forEach(k => {
    if (k >= todayKey) keys.add(k);
  });
  Object.values(settings.categoryDayOverrides ?? {}).forEach(dates => {
    Object.keys(dates).forEach(k => {
      if (k >= todayKey) keys.add(k);
    });
  });
  return [...keys].sort();
}

/** Souhrn provozní doby z rezervačního systému pro záložku Profil */
export function buildClubOpeningHoursProfile(
  settings: ClubSettings,
  refDate = new Date(),
): ClubOpeningHoursProfile {
  const todayKey = localDateKey(refDate);
  const dateSettings = mergeSettingsForDate(settings, todayKey);
  const effective = effectiveHoursForDisplay(todayKey, settings);
  const fmt = fmtDay(refDate);
  const weekday = WEEKDAY_NAMES[getWeekdayIndex(todayKey)];

  const extraordinary: ExtraordinaryOpeningEntry[] = [];
  for (const dateKey of relevantDateKeys(settings, todayKey)) {
    extraordinary.push(...collectExtraordinaryForDate(dateKey, settings, todayKey));
  }

  const schedule = dateSettings.openingSchedule;
  const scheduleLines = [`Výchozí: ${formatDayHours(schedule.default)}`];
  if (schedule.weekday) scheduleLines.push(`Po–Pá: ${formatDayHours(schedule.weekday)}`);
  if (schedule.weekend) scheduleLines.push(`So–Ne: ${formatDayHours(schedule.weekend)}`);

  const holiday = getCzechHoliday(todayKey);

  return {
    seasonLabel: settings.seasonalModeEnabled
      ? SEASON_LABELS[getEffectiveSeasonId(todayKey, settings)]
      : undefined,
    holidayToday: holiday?.name,
    todayLabel: `Dnes (${weekday} ${fmt.num}. ${fmt.month})`,
    todayHoursLabel: effective ? formatDayHours(effective) : 'Uzavřeno',
    scheduleLines,
    holidayTreatment: holidayTreatmentLabel(dateSettings.holidayTreatment),
    extraordinary,
    hasExtraordinary: extraordinary.length > 0,
  };
}
