import type { ClubSettings, ClubClosurePeriod, ClubBooking } from '@/types/database';
import { localDateKey, slotToTime, slotEndTime, SLOT_START_HOUR } from '@/lib/mockData';
import { getDayHoursForDate, getDayHoursForCourt } from '@/lib/clubSchedule';
import { isCourtSeasonallyClosed, mergeSettingsForCourt } from '@/lib/clubSeason';
import { isCourtClosedByCalendarSeason, resolveCategoryId } from '@/lib/clubCategories';


export function isPartialCourtClosure(p: ClubClosurePeriod): boolean {
  return p.closedFromSlot !== undefined && p.closedToSlot !== undefined;
}

export function isFullDayClosurePeriod(p: ClubClosurePeriod): boolean {
  return !isPartialCourtClosure(p);
}

export function findClosurePeriodForDate(
  dateKey: string,
  settings: ClubSettings,
  categoryId?: string,
): ClubClosurePeriod | undefined {
  return settings.closurePeriods.find(p => {
    if (p.courtId) return false;
    if (!isFullDayClosurePeriod(p)) return false;
    if (dateKey < p.fromDate || dateKey > p.toDate) return false;
    if (!p.categoryId) return true;
    if (categoryId) return p.categoryId === categoryId;
    return false;
  });
}

export function findCourtClosurePeriod(
  courtId: string,
  dateKey: string,
  settings: ClubSettings,
): ClubClosurePeriod | undefined {
  return settings.closurePeriods.find(p =>
    p.courtId === courtId
    && isFullDayClosurePeriod(p)
    && dateKey >= p.fromDate
    && dateKey <= p.toDate,
  );
}

export function getCourtClosurePeriods(
  courtId: string,
  settings: ClubSettings,
): ClubClosurePeriod[] {
  return settings.closurePeriods.filter(p => p.courtId === courtId);
}

export function findCourtPartialClosuresForDate(
  courtId: string,
  dateKey: string,
  settings: ClubSettings,
): ClubClosurePeriod[] {
  return settings.closurePeriods.filter(p =>
    p.courtId === courtId
    && isPartialCourtClosure(p)
    && dateKey >= p.fromDate
    && dateKey <= p.toDate,
  );
}

export function findClosurePeriodForCourt(
  courtId: string,
  dateKey: string,
  settings: ClubSettings,
): ClubClosurePeriod | undefined {
  const clubWide = settings.closurePeriods.find(p =>
    !p.categoryId && !p.courtId && isFullDayClosurePeriod(p)
    && dateKey >= p.fromDate && dateKey <= p.toDate,
  );
  if (clubWide) return clubWide;
  const courtSpecific = findCourtClosurePeriod(courtId, dateKey, settings);
  if (courtSpecific) return courtSpecific;
  const categoryId = resolveCategoryId(courtId, settings);
  if (!categoryId) return undefined;
  return findClosurePeriodForDate(dateKey, settings, categoryId);
}

export function isCourtSlotInClosure(
  courtId: string,
  dateKey: string,
  slotIdx: number,
  settings: ClubSettings,
): boolean {
  if (findClosurePeriodForCourt(courtId, dateKey, settings)) return true;
  return findCourtPartialClosuresForDate(courtId, dateKey, settings).some(p =>
    slotIdx >= p.closedFromSlot! && slotIdx <= p.closedToSlot!,
  );
}

export function formatCourtClosureType(period: ClubClosurePeriod): string {
  if (!isPartialCourtClosure(period)) return 'Celý den';
  return `${slotToTime(period.closedFromSlot!)}–${slotEndTime(period.closedToSlot!)}`;
}

export function isDateFullyClosed(dateKey: string, settings: ClubSettings): boolean {
  return settings.closurePeriods.some(p =>
    !p.categoryId && !p.courtId && isFullDayClosurePeriod(p)
    && dateKey >= p.fromDate && dateKey <= p.toDate,
  );
}

export function isCourtDateFullyClosed(
  courtId: string,
  dateKey: string,
  settings: ClubSettings,
): boolean {
  return !!findClosurePeriodForCourt(courtId, dateKey, settings);
}

/** Poslední slot, který lze rezervovat v daný den (po předčasném uzavření) */
export function getEffectiveClosingSlot(dateKey: string, settings: ClubSettings): number {
  const todayKey = localDateKey();
  let closing = getDayHoursForDate(dateKey, settings).closingSlot;
  if (dateKey === todayKey && settings.earlyCloseEnabled) {
    closing = Math.min(closing, settings.earlyCloseSlot - 1);
  }
  return closing;
}

export function getOpeningSlotForDate(dateKey: string, settings: ClubSettings): number {
  return getDayHoursForDate(dateKey, settings).openingSlot;
}

export function getClosureMessageForDate(dateKey: string, settings: ClubSettings): string | undefined {
  const period = findClosurePeriodForDate(dateKey, settings);
  if (period?.note) return period.note;
  const todayKey = localDateKey();
  if (dateKey === todayKey && settings.earlyCloseEnabled && settings.earlyCloseNote) {
    return settings.earlyCloseNote;
  }
  return undefined;
}

export function getClosureTitleForDate(dateKey: string, settings: ClubSettings): string {
  if (isDateFullyClosed(dateKey, settings)) return 'Sportoviště je uzavřeno';
  const todayKey = localDateKey();
  if (dateKey === todayKey && settings.earlyCloseEnabled) {
    return `Dnes uzavřeno od ${slotToTime(settings.earlyCloseSlot)}`;
  }
  return 'Uzavřeno';
}

export function isSlotBookable(
  slotIdx: number,
  dateKey: string,
  settings: ClubSettings,
  nowMinutes: number,
): boolean {
  if (isDateFullyClosed(dateKey, settings)) return false;

  const dayHours = getDayHoursForDate(dateKey, settings);
  if (slotIdx < dayHours.openingSlot) return false;

  const effectiveClosing = getEffectiveClosingSlot(dateKey, settings);
  if (slotIdx > effectiveClosing) return false;

  const todayKey = localDateKey();
  if (dateKey === todayKey) {
    const slotEndMinutes = SLOT_START_HOUR * 60 + (slotIdx + 1) * 30;
    if (slotEndMinutes <= nowMinutes) return false;
  }
  return true;
}

/** Jako isSlotBookable, ale respektuje sezónní uzavření a profil konkrétního kurtu */
export function isSlotBookableForCourt(
  slotIdx: number,
  courtId: string,
  dateKey: string,
  settings: ClubSettings,
  nowMinutes: number,
): boolean {
  if (isCourtSlotInClosure(courtId, dateKey, slotIdx, settings)) return false;
  if (isCourtSeasonallyClosed(courtId, dateKey, settings)) return false;
  if (isCourtClosedByCalendarSeason(courtId, dateKey, settings)) return false;
  const courtSettings = mergeSettingsForCourt(settings, courtId, dateKey);
  const dayHours = getDayHoursForCourt(courtId, dateKey, settings);
  if (dayHours.closingSlot < dayHours.openingSlot) return false;
  if (slotIdx < dayHours.openingSlot) return false;

  const todayKey = localDateKey();
  let closing = dayHours.closingSlot;
  if (dateKey === todayKey && courtSettings.earlyCloseEnabled) {
    closing = Math.min(closing, courtSettings.earlyCloseSlot - 1);
  }
  if (slotIdx > closing) return false;

  if (dateKey === todayKey) {
    const slotEndMinutes = SLOT_START_HOUR * 60 + (slotIdx + 1) * 30;
    if (slotEndMinutes <= nowMinutes) return false;
  }
  return true;
}

export function getEffectiveClosingSlotForCourt(
  courtId: string,
  dateKey: string,
  settings: ClubSettings,
): number {
  if (isCourtSeasonallyClosed(courtId, dateKey, settings)) return -1;
  if (isCourtClosedByCalendarSeason(courtId, dateKey, settings)) return -1;
  const courtSettings = mergeSettingsForCourt(settings, courtId, dateKey);
  return getEffectiveClosingSlot(dateKey, courtSettings);
}

export function getOpeningSlotForCourt(
  courtId: string,
  dateKey: string,
  settings: ClubSettings,
): number {
  if (isCourtSeasonallyClosed(courtId, dateKey, settings)) return 0;
  if (isCourtClosedByCalendarSeason(courtId, dateKey, settings)) return 0;
  return getDayHoursForCourt(courtId, dateKey, settings).openingSlot;
}

/** Výchozí slot předčasného uzavření = po běžné zavírací době (žádné omezení) */
export function defaultEarlyCloseSlot(dateKey: string, settings: ClubSettings): number {
  return getDayHoursForDate(dateKey, settings).closingSlot + 1;
}

export function fmtDateKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return `${d}. ${m}. ${y}`;
}

/** Rezervace v dnešním dni, která koliduje s předčasným uzavřením od `earlyCloseSlot` */
export function findEarlyCloseBookingConflict(
  bookings: ClubBooking[],
  settings: ClubSettings,
  earlyCloseSlot: number,
): ClubBooking | undefined {
  const todayKey = localDateKey();
  const dayClosing = getDayHoursForDate(todayKey, settings).closingSlot;
  if (earlyCloseSlot > dayClosing) return undefined;

  return bookings.find(b =>
    b.date === todayKey
    && b.status !== 'cancelled'
    && b.slots.some(s => s >= earlyCloseSlot),
  );
}

export function formatEarlyCloseConflict(booking: ClubBooking): string {
  const slotMin = Math.min(...booking.slots);
  return `Nelze uzavřít — rezervace ${booking.player_name} (${slotToTime(slotMin)}–${slotEndTime(Math.max(...booking.slots))})`;
}

/** Najde nejbližší slot předčasného uzavření bez kolize s rezervacemi */
export function findValidEarlyCloseSlot(
  bookings: ClubBooking[],
  settings: ClubSettings,
  preferredSlot?: number,
): number | null {
  const todayKey = localDateKey();
  const dayClosing = getDayHoursForDate(todayKey, settings).closingSlot;
  const minSlot = getDayHoursForDate(todayKey, settings).openingSlot + 1;
  const start = preferredSlot ?? settings.earlyCloseSlot;

  for (let slot = Math.max(start, minSlot); slot <= dayClosing + 1; slot++) {
    if (!findEarlyCloseBookingConflict(bookings, settings, slot)) return slot;
  }
  for (let slot = minSlot; slot < start; slot++) {
    if (!findEarlyCloseBookingConflict(bookings, settings, slot)) return slot;
  }
  return null;
}

/** Lze zapnout / posunout předčasné uzavření na daný slot? */
export function canApplyEarlyClose(
  bookings: ClubBooking[],
  settings: ClubSettings,
  earlyCloseSlot: number,
): { ok: true } | { ok: false; booking: ClubBooking } {
  const conflict = findEarlyCloseBookingConflict(bookings, settings, earlyCloseSlot);
  if (conflict) return { ok: false, booking: conflict };
  return { ok: true };
}
