import type {
  ClubSettings,
  CourtPriceRule,
  DayHours,
  PriceDayScope,
  WeekdayIndex,
  HolidayTreatment,
} from '@/types/database';
import { slotToTime, slotEndTime, SLOT_COUNT } from '@/lib/mockData';
import { isCzechPublicHoliday } from '@/lib/czechHolidays';
import {
  isCourtSeasonallyClosed,
  mergeSettingsForCourt,
} from '@/lib/clubSeason';
export const WEEKDAY_NAMES = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];
export const WEEKDAY_SHORT = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

export const PRICE_SCOPE_LABELS: Record<string, string> = {
  all: 'Všechny dny',
  weekday: 'Pracovní dny',
  weekend: 'Víkend',
  holiday: 'Státní svátky',
  '0': 'Pondělí',
  '1': 'Úterý',
  '2': 'Středa',
  '3': 'Čtvrtek',
  '4': 'Pátek',
  '5': 'Sobota',
  '6': 'Neděle',
};

export function scopeLabel(scope: PriceDayScope): string {
  return PRICE_SCOPE_LABELS[String(scope)] ?? String(scope);
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 0 = pondělí … 6 = neděle */
export function getWeekdayIndex(dateKey: string): WeekdayIndex {
  const d = parseDateKey(dateKey).getDay();
  return (d === 0 ? 6 : d - 1) as WeekdayIndex;
}

export function isHolidayDate(dateKey: string, _settings?: ClubSettings): boolean {
  return isCzechPublicHoliday(dateKey);
}

function hoursForGroup(
  schedule: ClubSettings['openingSchedule'],
  settings: ClubSettings,
  group: HolidayTreatment,
): DayHours {
  if (group === 'weekend' && schedule.weekend) return schedule.weekend;
  if (group === 'weekday' && schedule.weekday) return schedule.weekday;
  return schedule.default ?? {
    openingSlot: settings.openingSlot,
    closingSlot: settings.closingSlot,
  };
}

/** Provozní doba pro konkrétní kurt a den (sezóna + vlastní profil kurtu) */
export function getDayHoursForCourt(
  courtId: string,
  dateKey: string,
  settings: ClubSettings,
): DayHours {
  if (isCourtSeasonallyClosed(courtId, dateKey, settings)) {
    return { openingSlot: 0, closingSlot: -1 };
  }
  const effective = mergeSettingsForCourt(settings, courtId, dateKey);
  return getDayHoursForDate(dateKey, effective);
}

/** Provozní doba pro konkrétní kalendářní den */
export function getDayHoursForDate(dateKey: string, settings: ClubSettings): DayHours {
  const schedule = settings.openingSchedule;
  const dateOverride = schedule.dateOverrides?.find(o => o.date === dateKey);
  if (dateOverride) return dateOverride.hours;

  if (isCzechPublicHoliday(dateKey)) {
    return hoursForGroup(schedule, settings, settings.holidayTreatment);
  }

  const dayIdx = getWeekdayIndex(dateKey);
  const byDay = schedule.byDay?.[dayIdx];
  if (byDay) return byDay;

  const isWeekend = dayIdx >= 5;
  if (isWeekend && schedule.weekend) return schedule.weekend;
  if (!isWeekend && schedule.weekday) return schedule.weekday;

  return schedule.default ?? {
    openingSlot: settings.openingSlot,
    closingSlot: settings.closingSlot,
  };
}

export function getOpeningSlotForDate(dateKey: string, settings: ClubSettings): number {
  return getDayHoursForDate(dateKey, settings).openingSlot;
}

export function formatDayHours(hours: DayHours): string {
  return `${slotToTime(hours.openingSlot)} – ${slotEndTime(hours.closingSlot)}`;
}

export function defaultDayHours(settings: ClubSettings): DayHours {
  return {
    openingSlot: settings.openingSlot,
    closingSlot: settings.closingSlot,
  };
}

function findPriceRule(
  courtId: string,
  dateKey: string,
  settings: ClubSettings,
): CourtPriceRule | undefined {
  const effective = mergeSettingsForCourt(settings, courtId, dateKey);
  const rules = effective.pricing?.rules ?? [];
  const courtRules = rules.filter(r => r.courtId === courtId);
  const dayIdx = getWeekdayIndex(dateKey);
  const isHol = isCzechPublicHoliday(dateKey);
  const isWeekend = dayIdx >= 5;

  if (isHol) {
    const hol = courtRules.find(r => r.scope === 'holiday');
    if (hol) return hol;
    const group = effective.holidayTreatment;
    if (group === 'weekend') {
      const wknd = courtRules.find(r => r.scope === 'weekend');
      if (wknd) return wknd;
    } else {
      const wkd = courtRules.find(r => r.scope === 'weekday');
      if (wkd) return wkd;
    }
    return courtRules.find(r => r.scope === 'all');
  }

  const byDay = courtRules.find(r => typeof r.scope === 'number' && r.scope === dayIdx);
  if (byDay) return byDay;

  if (isWeekend) {
    const wknd = courtRules.find(r => r.scope === 'weekend');
    if (wknd) return wknd;
  } else {
    const wkd = courtRules.find(r => r.scope === 'weekday');
    if (wkd) return wkd;
  }

  return courtRules.find(r => r.scope === 'all');
}

/** Cena za hodinu pro konkrétní slot */
export function getSlotPricePerHour(
  courtId: string,
  dateKey: string,
  slotIdx: number,
  basePricePerHour: number,
  settings: ClubSettings,
): number {
  const rule = findPriceRule(courtId, dateKey, settings);
  if (!rule || rule.bands.length === 0) return basePricePerHour;

  const band = rule.bands.find(b => slotIdx >= b.fromSlot && slotIdx <= b.toSlot);
  return band?.pricePerHour ?? basePricePerHour;
}

/** Celková cena za vybrané sloty (30 min / slot) */
export function calculateSlotsPrice(
  courtId: string,
  dateKey: string,
  slots: number[],
  basePricePerHour: number,
  settings: ClubSettings,
): number {
  return slots.reduce((sum, slot) => {
    const hourly = getSlotPricePerHour(courtId, dateKey, slot, basePricePerHour, settings);
    return sum + hourly * 0.5;
  }, 0);
}

export function clampDayHours(hours: DayHours): DayHours {
  const opening = Math.max(0, Math.min(SLOT_COUNT - 2, hours.openingSlot));
  const closing = Math.max(opening + 1, Math.min(SLOT_COUNT - 1, hours.closingSlot));
  return { openingSlot: opening, closingSlot: closing };
}

export function upsertPriceRule(
  rules: CourtPriceRule[],
  rule: CourtPriceRule,
): CourtPriceRule[] {
  const idx = rules.findIndex(
    r => r.courtId === rule.courtId && r.scope === rule.scope,
  );
  if (idx === -1) return [...rules, rule];
  const next = [...rules];
  next[idx] = rule;
  return next;
}

export function removePriceRule(
  rules: CourtPriceRule[],
  courtId: string,
  scope: PriceDayScope,
): CourtPriceRule[] {
  return rules.filter(r => r.courtId !== courtId || r.scope !== scope);
}
