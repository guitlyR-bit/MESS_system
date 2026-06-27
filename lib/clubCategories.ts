import type {
  ClubBooking,
  ClubPricing,
  ClubSettings,
  CourtCategory,
  CourtPriceRule,
  CourtWithClub,
  DayHours,
  DayHoursPartialOverride,
  OpeningSchedule,
  Season,
} from '@/types/database';
import { cloneOpeningSchedule } from '@/lib/clubSeason';
import { CATEGORY_COLORS, localDateKey } from '@/lib/mockData';

export function getSeasonById(
  settings: ClubSettings,
  seasonId: string,
): Season | undefined {
  return settings.seasons?.find(s => s.id === seasonId);
}

export function isSeasonClosed(season: Season | undefined): boolean {
  return season?.is_closed === true;
}

export function isDateInSeasonRange(dateKey: string, season: Season): boolean {
  return dateKey >= season.start_date && dateKey <= season.end_date;
}

/** Kurt je v období uzavřené kalendářní sezóny své kategorie */
export function isCourtClosedByCalendarSeason(
  courtId: string,
  dateKey: string,
  settings: ClubSettings,
): boolean {
  if (!settings.seasonalModeEnabled) return false;
  const category = getCategoryForCourt(courtId, settings);
  if (!category?.season_id) return false;
  const season = getSeasonById(settings, category.season_id);
  if (!isSeasonClosed(season)) return false;
  return isDateInSeasonRange(dateKey, season!);
}

export function getCourtIdsForSeason(
  settings: ClubSettings,
  seasonId: string,
): string[] {
  return settings.categories
    .filter(c => c.season_id === seasonId)
    .flatMap(c => c.court_ids);
}

/** Budoucí potvrzené rezervace na kurtech kategorií dané sezóny v jejím období */
export function findFutureBookingsForClosedSeason(
  bookings: ClubBooking[],
  settings: ClubSettings,
  seasonId: string,
  fromDateKey: string = localDateKey(),
): ClubBooking[] {
  const season = getSeasonById(settings, seasonId);
  if (!season) return [];
  const courtIds = new Set(getCourtIdsForSeason(settings, seasonId));
  if (!courtIds.size) return [];

  return bookings.filter(b =>
    b.status === 'confirmed'
    && b.date >= fromDateKey
    && b.date >= season.start_date
    && b.date <= season.end_date
    && courtIds.has(b.court_id),
  );
}

export function getSeasonName(
  settings: ClubSettings,
  seasonId?: string,
): string | undefined {
  if (!seasonId) return undefined;
  return getSeasonById(settings, seasonId)?.name;
}

/** Název sezóny kategorie — jen když je zapnutý sezónní režim */
export function getCategorySeasonLabel(
  settings: ClubSettings,
  seasonId?: string,
): string | undefined {
  if (!settings.seasonalModeEnabled) return undefined;
  return getSeasonName(settings, seasonId);
}

/** Sezóna platná pro dané kalendářní datum */
export function getActiveCalendarSeason(
  seasons: Season[],
  dateKey: string = localDateKey(),
): Season | undefined {
  return seasons.find(s => dateKey >= s.start_date && dateKey <= s.end_date);
}

export function filterCategoriesBySeason(
  categories: CourtCategory[],
  seasonId: string | null,
): CourtCategory[] {
  if (!seasonId) return categories;
  return categories.filter(c => c.season_id === seasonId);
}

/** Hex barva z preset id nebo přímo uloženého hexu */
export function resolveCategoryColorHex(color?: string): string {
  if (!color) return CATEGORY_COLORS[0].hex;
  const byId = CATEGORY_COLORS.find(c => c.id === color);
  if (byId) return byId.hex;
  const byHex = CATEGORY_COLORS.find(c => c.hex.toLowerCase() === color.toLowerCase());
  return byHex?.hex ?? color;
}

export function getCategoryForCourt(
  courtId: string,
  settings: ClubSettings,
): CourtCategory | undefined {
  return settings.categories.find(c => c.court_ids.includes(courtId));
}

export function getCourtCategoryColor(
  courtId: string,
  settings: ClubSettings,
): string {
  const cat = getCategoryForCourt(courtId, settings);
  return resolveCategoryColorHex(cat?.color);
}

/** Kurty viditelné v timeline — při sezónním režimu jen z aktivní kalendářní sezóny */
export function reorderArray<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/** Seřadí kurty podle pořadí v court_ids kategorie */
export function orderCourtsByIds(
  courts: CourtWithClub[],
  courtIds: string[],
): CourtWithClub[] {
  const byId = new Map(courts.map(c => [c.id, c]));
  return courtIds
    .map(id => byId.get(id))
    .filter((c): c is CourtWithClub => !!c);
}

/** Udrží pořadí nezařazených kurtů — existující order + nové na konec */
export function syncUncategorizedCourtOrder(
  categories: CourtCategory[],
  courts: CourtWithClub[],
  existingOrder: string[] = [],
): string[] {
  const assigned = new Set(categories.flatMap(c => c.court_ids));
  const uncategorizedIds = courts.filter(c => !assigned.has(c.id)).map(c => c.id);
  const next = existingOrder.filter(id => uncategorizedIds.includes(id));
  for (const id of uncategorizedIds) {
    if (!next.includes(id)) next.push(id);
  }
  return next;
}

/** Kurty v pořadí pro timeline: kategorie → court_ids → nezařazené */
export function getOrderedCourtsForTimeline(
  settings: ClubSettings,
  courts: CourtWithClub[],
  dateKey: string = localDateKey(),
): CourtWithClub[] {
  let categories = settings.categories;
  if (settings.seasonalModeEnabled) {
    const activeSeason = getActiveCalendarSeason(settings.seasons ?? [], dateKey);
    if (!activeSeason) return [];
    categories = categories.filter(c => c.season_id === activeSeason.id);
  }

  const byId = new Map(courts.map(c => [c.id, c]));
  const result: CourtWithClub[] = [];
  const seen = new Set<string>();

  for (const cat of categories) {
    for (const courtId of cat.court_ids) {
      const court = byId.get(courtId);
      if (court && !seen.has(courtId)) {
        result.push(court);
        seen.add(courtId);
      }
    }
  }

  if (!settings.seasonalModeEnabled) {
    for (const court of getUncategorizedCourts(courts, settings)) {
      if (!seen.has(court.id)) {
        result.push(court);
        seen.add(court.id);
      }
    }
  }

  return result;
}

export function filterCourtsByActiveSeason(
  courts: CourtWithClub[],
  settings: ClubSettings,
  dateKey: string = localDateKey(),
): CourtWithClub[] {
  return getOrderedCourtsForTimeline(settings, courts, dateKey);
}

export function defaultCategoryColor(existingCategories: CourtCategory[]): string {
  const used = new Set(existingCategories.map(c => resolveCategoryColorHex(c.color)));
  return CATEGORY_COLORS.find(c => !used.has(c.hex))?.hex ?? CATEGORY_COLORS[0].hex;
}

export function getUncategorizedCourts(
  courts: CourtWithClub[],
  settings: ClubSettings,
): CourtWithClub[] {
  const assigned = new Set(settings.categories.flatMap(c => c.court_ids));
  const uncategorized = courts.filter(c => !assigned.has(c.id));
  const order = settings.uncategorizedCourtOrder ?? [];
  if (!order.length) return uncategorized;
  const ordered = orderCourtsByIds(uncategorized, order);
  const seen = new Set(ordered.map(c => c.id));
  return [...ordered, ...uncategorized.filter(c => !seen.has(c.id))];
}

export function getCategoryOpeningSchedule(
  settings: ClubSettings,
  categoryId: string,
): OpeningSchedule {
  return settings.categoryOpeningSchedule?.[categoryId] ?? settings.openingSchedule;
}

export function formatSeasonDates(season: Season): string {
  const fmt = (d: string) => {
    const [, m, day] = d.split('-');
    return `${Number(day)}.${Number(m)}.`;
  };
  return `${fmt(season.start_date)} – ${fmt(season.end_date)}`;
}

/** Kategorie, do které patří kurt (podle court_ids v definici kategorie) */
export function resolveCategoryId(
  courtId: string,
  settings: ClubSettings,
): string | undefined {
  return settings.categories.find(c => c.court_ids.includes(courtId))?.id;
}

export function getCategoryById(
  settings: ClubSettings,
  categoryId: string,
): CourtCategory | undefined {
  return settings.categories.find(c => c.id === categoryId);
}

export function getCourtIdsInCategory(
  settings: ClubSettings,
  categoryId: string,
): string[] {
  return getCategoryById(settings, categoryId)?.court_ids ?? [];
}

export function courtsInCategory(
  courts: CourtWithClub[],
  categoryId: string,
  settings: ClubSettings,
): CourtWithClub[] {
  return orderCourtsByIds(courts, getCourtIdsInCategory(settings, categoryId));
}

/** Nastavení s kategoriálním rozvrhem jako výchozím openingSchedule */
export function settingsWithCategorySchedule(
  settings: ClubSettings,
  categoryId?: string,
): ClubSettings {
  if (!categoryId) return settings;
  const schedule = settings.categoryOpeningSchedule?.[categoryId];
  if (!schedule) return settings;
  return { ...settings, openingSchedule: schedule };
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

export function hasAnyDayHoursOverride(
  dateKey: string,
  settings: ClubSettings,
  categoryId?: string,
): boolean {
  if (categoryId) return hasCategoryDayHoursOverride(categoryId, dateKey, settings);
  const clubPartial = settings.dayOverrides?.[dateKey];
  if (clubPartial && (clubPartial.openingSlot !== undefined || clubPartial.closingSlot !== undefined)) {
    return true;
  }
  return false;
}

/** Merge: globální → kategorie (rozvrh) → klub dayOverride → kategorie dayOverride */
export function mergeDayHoursLayers(
  base: DayHours,
  clubPartial?: DayHoursPartialOverride,
  categoryPartial?: DayHoursPartialOverride,
): DayHours {
  let opening = base.openingSlot;
  let closing = base.closingSlot;
  if (clubPartial) {
    if (clubPartial.openingSlot !== undefined) opening = clubPartial.openingSlot;
    if (clubPartial.closingSlot !== undefined) closing = clubPartial.closingSlot;
  }
  if (categoryPartial) {
    if (categoryPartial.openingSlot !== undefined) opening = categoryPartial.openingSlot;
    if (categoryPartial.closingSlot !== undefined) closing = categoryPartial.closingSlot;
  }
  return { openingSlot: opening, closingSlot: closing };
}

export function syncCourtCategoryIds(
  categories: CourtCategory[],
): Record<string, string | undefined> {
  const map: Record<string, string | undefined> = {};
  for (const cat of categories) {
    for (const courtId of cat.court_ids) {
      map[courtId] = cat.id;
    }
  }
  return map;
}

export function reorderCategories(
  categories: CourtCategory[],
  fromIndex: number,
  toIndex: number,
): CourtCategory[] {
  return reorderArray(categories, fromIndex, toIndex);
}

export function reorderCourtsInCategoryList(
  categories: CourtCategory[],
  categoryId: string,
  fromIndex: number,
  toIndex: number,
): CourtCategory[] {
  return categories.map(cat =>
    cat.id === categoryId
      ? { ...cat, court_ids: reorderArray(cat.court_ids, fromIndex, toIndex) }
      : cat,
  );
}

export function reorderUncategorizedCourtOrder(
  order: string[],
  fromIndex: number,
  toIndex: number,
): string[] {
  return reorderArray(order, fromIndex, toIndex);
}

export function assignCourtToCategory(
  categories: CourtCategory[],
  courtId: string,
  categoryId: string | null,
): CourtCategory[] {
  const without = categories.map(cat => ({
    ...cat,
    court_ids: cat.court_ids.filter(id => id !== courtId),
  }));
  if (!categoryId) return without;
  return without.map(cat =>
    cat.id === categoryId
      ? { ...cat, court_ids: [...cat.court_ids, courtId] }
      : cat,
  );
}

export function createCategory(
  categories: CourtCategory[],
  name: string,
  seasonId?: string,
  color?: string,
): CourtCategory[] {
  const id = `cat_${Date.now()}`;
  return [...categories, {
    id,
    name: name.trim(),
    court_ids: [],
    color: color ?? defaultCategoryColor(categories),
    season_id: seasonId,
  }];
}

export function removeCategory(
  categories: CourtCategory[],
  categoryId: string,
): CourtCategory[] {
  return categories.filter(c => c.id !== categoryId);
}

export function renameCategory(
  categories: CourtCategory[],
  categoryId: string,
  name: string,
): CourtCategory[] {
  return categories.map(c =>
    c.id === categoryId ? { ...c, name: name.trim() } : c,
  );
}

/** Zkopíruje pravidla kategorie na všechny kurty v ní (pro courtId v globálním ceníku) */
export function expandCategoryRulesToCourts(
  categoryId: string,
  rules: CourtPriceRule[],
  courtIds: string[],
): CourtPriceRule[] {
  const expanded: CourtPriceRule[] = [];
  for (const rule of rules) {
    for (const courtId of courtIds) {
      expanded.push({
        ...rule,
        id: `${rule.id}_${courtId}`,
        courtId,
        categoryId: undefined,
      });
    }
  }
  return expanded;
}

/** Odstraní per-court pravidla pro kurty v kategorii a nahradí pravidly z categoryPricing */
export function mergePricingWithCategory(
  globalPricing: ClubPricing,
  categoryPricing: Record<string, ClubPricing>,
  categories: CourtCategory[],
): ClubPricing {
  const courtIdsInCategories = new Set(
    categories.flatMap(c => c.court_ids),
  );
  let rules = globalPricing.rules.filter(r =>
    !r.courtId || !courtIdsInCategories.has(r.courtId),
  );

  for (const cat of categories) {
    const catPricing = categoryPricing[cat.id];
    if (!catPricing?.rules.length) continue;
    rules = [
      ...rules,
      ...expandCategoryRulesToCourts(cat.id, catPricing.rules, cat.court_ids),
    ];
  }
  return { rules };
}

/** Základní cena/hod z prvního pásma pravidla „all“ nebo prvního pravidla */
export function basePriceFromCategoryPricing(pricing: ClubPricing): number | null {
  const allRule = pricing.rules.find(r => r.scope === 'all') ?? pricing.rules[0];
  if (!allRule?.bands.length) return null;
  return allRule.bands[0].pricePerHour;
}

export function cloneCategoryOpeningSchedules(
  src?: Record<string, OpeningSchedule>,
): Record<string, OpeningSchedule> | undefined {
  if (!src) return undefined;
  return Object.fromEntries(
    Object.entries(src).map(([k, v]) => [k, cloneOpeningSchedule(v)]),
  );
}

export function cloneCategoryDayOverrides(
  src?: Record<string, Record<string, DayHoursPartialOverride>>,
): Record<string, Record<string, DayHoursPartialOverride>> | undefined {
  if (!src) return undefined;
  return Object.fromEntries(
    Object.entries(src).map(([catId, dates]) => [
      catId,
      Object.fromEntries(
        Object.entries(dates).map(([dk, v]) => [dk, { ...v }]),
      ),
    ]),
  );
}

export function cloneCategoryPricing(
  src?: Record<string, ClubPricing>,
): Record<string, ClubPricing> | undefined {
  if (!src) return undefined;
  return Object.fromEntries(
    Object.entries(src).map(([k, p]) => [
      k,
      {
        rules: p.rules.map(r => ({
          ...r,
          bands: r.bands.map(b => ({ ...b })),
        })),
      },
    ]),
  );
}
