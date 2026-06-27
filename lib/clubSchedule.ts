import type {
  ClubBooking,
  ClubSettings,
  CourtPriceRule,
  DayHours,
  DayHoursPartialOverride,
  PriceDayScope,
  WeekdayIndex,
  HolidayTreatment,
} from '@/types/database';
import { slotToTime, slotEndTime, SLOT_COUNT, localDateKey } from '@/lib/mockData';
import { isCzechPublicHoliday } from '@/lib/czechHolidays';
import {
  isCourtSeasonallyClosed,
  mergeSettingsForCourt,
} from '@/lib/clubSeason';
import {
  mergeDayHoursLayers,
  resolveCategoryId,
  settingsWithCategorySchedule,
  getCourtIdsInCategory,
} from '@/lib/clubCategories';
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

/** Provozní doba pro konkrétní kurt a den (sezóna + kategorie + vlastní profil kurtu) */
export function getDayHoursForCourt(
  courtId: string,
  dateKey: string,
  settings: ClubSettings,
): DayHours {
  if (isCourtSeasonallyClosed(courtId, dateKey, settings)) {
    return { openingSlot: 0, closingSlot: -1 };
  }
  const effective = mergeSettingsForCourt(settings, courtId, dateKey);
  const categoryId = resolveCategoryId(courtId, effective);
  return getDayHoursForCourtWithCategory(courtId, dateKey, effective, categoryId);
}

function getDayHoursForCourtWithCategory(
  _courtId: string,
  dateKey: string,
  settings: ClubSettings,
  categoryId?: string,
): DayHours {
  const catSettings = settingsWithCategorySchedule(settings, categoryId);
  const base = getScheduledDayHours(dateKey, catSettings);
  const clubPartial = settings.dayOverrides?.[dateKey];
  const categoryPartial = categoryId
    ? settings.categoryDayOverrides?.[categoryId]?.[dateKey]
    : undefined;
  return clampDayHours(mergeDayHoursLayers(base, clubPartial, categoryPartial));
}

export function hasCategoryDayHoursOverride(
  categoryId: string,
  dateKey: string,
  settings: ClubSettings,
): boolean {
  const partial = settings.categoryDayOverrides?.[categoryId]?.[dateKey];
  if (!partial) return false;
  return partial.openingSlot !== undefined || partial.closingSlot !== undefined;
}

/** Provozní doba z rozvrhu (bez admin dayOverrides) */
export function getScheduledDayHours(dateKey: string, settings: ClubSettings): DayHours {
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

export function hasDayHoursOverride(dateKey: string, settings: ClubSettings): boolean {
  const partial = settings.dayOverrides?.[dateKey];
  if (!partial) return false;
  return partial.openingSlot !== undefined || partial.closingSlot !== undefined;
}

/** Provozní doba pro konkrétní kalendářní den (včetně admin dayOverrides) */
export function getDayHoursForDate(dateKey: string, settings: ClubSettings): DayHours {
  const base = getScheduledDayHours(dateKey, settings);
  const partial = settings.dayOverrides?.[dateKey];
  if (!partial) return base;

  return clampDayHours({
    openingSlot: partial.openingSlot ?? base.openingSlot,
    closingSlot: partial.closingSlot ?? base.closingSlot,
  });
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
  const categoryId = resolveCategoryId(courtId, effective);
  const rules = effective.pricing?.rules ?? [];
  const categoryRules = categoryId
    ? (effective.categoryPricing?.[categoryId]?.rules ?? [])
    : [];
  const courtRules = rules.filter(r => r.courtId === courtId);
  const allRules = [...courtRules, ...categoryRules];
  const dayIdx = getWeekdayIndex(dateKey);
  const isHol = isCzechPublicHoliday(dateKey);
  const isWeekend = dayIdx >= 5;

  if (isHol) {
    const hol = allRules.find(r => r.scope === 'holiday');
    if (hol) return hol;
    const group = effective.holidayTreatment;
    if (group === 'weekend') {
      const wknd = allRules.find(r => r.scope === 'weekend');
      if (wknd) return wknd;
    } else {
      const wkd = allRules.find(r => r.scope === 'weekday');
      if (wkd) return wkd;
    }
    return allRules.find(r => r.scope === 'all');
  }

  const byDay = allRules.find(r => typeof r.scope === 'number' && r.scope === dayIdx);
  if (byDay) return byDay;

  if (isWeekend) {
    const wknd = allRules.find(r => r.scope === 'weekend');
    if (wknd) return wknd;
  } else {
    const wkd = allRules.find(r => r.scope === 'weekday');
    if (wkd) return wkd;
  }

  return allRules.find(r => r.scope === 'all');
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
  const idx = rules.findIndex(r => {
    if (rule.categoryId) {
      return r.categoryId === rule.categoryId && r.scope === rule.scope;
    }
    return r.courtId === rule.courtId && r.scope === rule.scope;
  });
  if (idx === -1) return [...rules, rule];
  const next = [...rules];
  next[idx] = rule;
  return next;
}

export function removePriceRule(
  rules: CourtPriceRule[],
  targetId: string,
  scope: PriceDayScope,
  kind: 'court' | 'category' = 'court',
): CourtPriceRule[] {
  return rules.filter(r => {
    if (kind === 'category') {
      return r.categoryId !== targetId || r.scope !== scope;
    }
    return r.courtId !== targetId || r.scope !== scope;
  });
}

/** Všechna kalendářní data v rozsahu včetně konců (YYYY-MM-DD) */
export function enumerateDateKeys(fromDate: string, toDate: string): string[] {
  const from = parseDateKey(fromDate);
  const to = parseDateKey(toDate);
  const keys: string[] = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    keys.push(localDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

/** Částečný override — jen pole odlišná od výchozího rozvrhu pro daný den */
export function buildPartialDayHoursOverride(
  base: DayHours,
  effective: DayHours,
): DayHoursPartialOverride | null {
  const partial: DayHoursPartialOverride = {};
  if (effective.openingSlot !== base.openingSlot) partial.openingSlot = effective.openingSlot;
  if (effective.closingSlot !== base.closingSlot) partial.closingSlot = effective.closingSlot;
  return Object.keys(partial).length > 0 ? partial : null;
}

function bookingOutsideDayHours(booking: ClubBooking, hours: DayHours): boolean {
  const slotMin = Math.min(...booking.slots);
  const slotMax = Math.max(...booking.slots);
  return slotMin < hours.openingSlot || slotMax > hours.closingSlot;
}

function bookingConflictsWithPartialOverride(
  booking: ClubBooking,
  dateKey: string,
  settings: ClubSettings,
  partial: DayHoursPartialOverride,
  categoryId?: string,
): boolean {
  const simSettings: ClubSettings = categoryId
    ? {
      ...settings,
      categoryDayOverrides: {
        ...settings.categoryDayOverrides,
        [categoryId]: {
          ...settings.categoryDayOverrides?.[categoryId],
          [dateKey]: {
            ...settings.categoryDayOverrides?.[categoryId]?.[dateKey],
            ...partial,
          },
        },
      },
    }
    : {
      ...settings,
      dayOverrides: {
        ...settings.dayOverrides,
        [dateKey]: {
          ...settings.dayOverrides?.[dateKey],
          ...partial,
        },
      },
    };
  const hours = getDayHoursForCourt(booking.court_id, dateKey, simSettings);
  if (hours.closingSlot < hours.openingSlot) return true;
  return bookingOutsideDayHours(booking, hours);
}

function filterBookingsByScope(
  bookings: ClubBooking[],
  settings: ClubSettings,
  options?: { categoryId?: string; courtId?: string },
): ClubBooking[] {
  if (options?.courtId) {
    return bookings.filter(b => b.court_id === options.courtId);
  }
  if (options?.categoryId) {
    const courtIds = new Set(getCourtIdsInCategory(settings, options.categoryId));
    return bookings.filter(b => courtIds.has(b.court_id));
  }
  return bookings;
}

/** Rezervace kolidující s navrhovanou změnou provozní doby (jeden den nebo rozsah) */
export function getBookingConflictsForDayHoursChange(
  fromDate: string,
  toDate: string,
  partial: DayHoursPartialOverride,
  bookings: ClubBooking[],
  settings: ClubSettings,
  options?: { categoryId?: string },
): ClubBooking[] {
  const scopedBookings = filterBookingsByScope(bookings, settings, options);
  const dates = enumerateDateKeys(fromDate, toDate);
  const conflicts: ClubBooking[] = [];
  const seen = new Set<string>();

  for (const dateKey of dates) {
    for (const booking of scopedBookings) {
      if (booking.date !== dateKey || booking.status === 'cancelled') continue;
      if (!bookingConflictsWithPartialOverride(
        booking, dateKey, settings, partial, options?.categoryId,
      )) continue;
      if (seen.has(booking.id)) continue;
      seen.add(booking.id);
      conflicts.push(booking);
    }
  }
  return conflicts;
}

/** Rezervace v období uzavření (celý den nebo časový úsek) */
export function getBookingConflictsForClosurePeriod(
  fromDate: string,
  toDate: string,
  bookings: ClubBooking[],
  settings?: ClubSettings,
  options?: {
    categoryId?: string;
    courtId?: string;
    closedFromSlot?: number;
    closedToSlot?: number;
  },
): ClubBooking[] {
  const scoped = settings
    ? filterBookingsByScope(bookings, settings, options)
    : bookings;
  const partial = options?.closedFromSlot !== undefined && options?.closedToSlot !== undefined;

  return scoped.filter(b => {
    if (b.status === 'cancelled') return false;
    if (b.date < fromDate || b.date > toDate) return false;
    if (!partial) return true;
    return b.slots.some(s => s >= options!.closedFromSlot! && s <= options!.closedToSlot!);
  });
}

/** Rezervace kolidující po zrušení denní výjimky (návrat k výchozímu rozvrhu) */
export function getBookingConflictsForClearingDayOverride(
  dateKey: string,
  bookings: ClubBooking[],
  settings: ClubSettings,
  options?: { categoryId?: string },
): ClubBooking[] {
  const scopedBookings = filterBookingsByScope(bookings, settings, options);
  const categoryId = options?.categoryId;

  if (categoryId) {
    const nextCatOverrides = { ...settings.categoryDayOverrides };
    const catDates = { ...nextCatOverrides[categoryId] };
    delete catDates[dateKey];
    nextCatOverrides[categoryId] = catDates;
    const simSettings: ClubSettings = { ...settings, categoryDayOverrides: nextCatOverrides };
    return scopedBookings.filter(b => {
      if (b.date !== dateKey || b.status === 'cancelled') return false;
      const hours = getDayHoursForCourt(b.court_id, dateKey, simSettings);
      if (hours.closingSlot < hours.openingSlot) return true;
      return bookingOutsideDayHours(b, hours);
    });
  }

  const nextOverrides = { ...settings.dayOverrides };
  delete nextOverrides[dateKey];
  const simSettings: ClubSettings = { ...settings, dayOverrides: nextOverrides };

  return scopedBookings.filter(b => {
    if (b.date !== dateKey || b.status === 'cancelled') return false;
    const hours = getDayHoursForCourt(b.court_id, dateKey, simSettings);
    if (hours.closingSlot < hours.openingSlot) return true;
    return bookingOutsideDayHours(b, hours);
  });
}

export function formatBookingConflictMessage(bookings: ClubBooking[], max = 5): string {
  const parts = bookings.slice(0, max).map(b => {
    const slotMin = Math.min(...b.slots);
    const slotMax = Math.max(...b.slots);
    return `${b.player_name} ${slotToTime(slotMin)}–${slotEndTime(slotMax)}`;
  });
  const suffix = bookings.length > max ? `, … (+${bookings.length - max})` : '';
  return `Úpravu nelze provést — existují rezervace v tomto období: ${parts.join(', ')}${suffix}`;
}
